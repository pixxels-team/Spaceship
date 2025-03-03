/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useRef, useEffect, useState } from 'react';
import clone from 'clone';
import { client } from '@gradio/client';
import objectHash from 'object-hash';
import { objType } from 'for-promise/utils/lib.mjs';

import Iframe from '@src/app/atoms/iframe/Iframe';

import { tinyConfirm, toast } from '@src/util/tools';
import { setLoadingPage } from '@src/app/templates/client/Loading';
import openTinyURL from '@src/util/message/urlProtection';
import { getRoomInfo } from '@src/app/organisms/room/Room';

import moment from '@src/util/libs/momentjs';
import initMatrix, { fetchFn } from '@src/client/initMatrix';

import settings from '@src/client/state/settings';
import cons from '@src/client/state/cons';
import tinyFixScrollChat from '@src/app/molecules/media/mediaFix';

import GradioLayout, { fileUrlGenerator } from './gradioLayout';

// Detect the mode to execute the input update
const updateInputValue = (input, dropdown, value, filePath = '') => {
  if (input.type === 'jquery') {
    if (dropdown && dropdown.type === 'jquery') dropdown.value.val(value);
    input.value.val(value);
  }

  if (input.type === 'blob') {
    const tinyUrl = `${filePath}${typeof value === 'string' ? (value.startsWith('/') || !filePath ? value : `/${value}`) : ''}`;
    if (!tinyUrl.startsWith('data:')) {
      setLoadingPage('Fetching gradio blob...');
      fetchFn(tinyUrl)
        .then((response) => response.blob())
        .then((blob) => {
          setLoadingPage(false);
          const reader = new FileReader();
          reader.onload = function () {
            input.value(this.result, true, tinyUrl);
          }; // <--- `this.result` contains a base64 data URI
          reader.readAsDataURL(blob);
        })
        .catch((err) => {
          setLoadingPage(false);
          toast(err.message);
          console.error(err);
        });
    } else {
      input.value(tinyUrl, true);
    }
  }
};

// Get input updates to send this to the gradio form
const getInputValues = (comps) => {
  // Input Values
  const inputs = [];
  let allowed = false;

  // Read data
  for (const index in comps.input) {
    // Result
    let result;

    // jQuery pure mode
    if (comps.input[index].data.type === 'jquery') {
      try {
        // Prepare the value
        let value = null;

        // This is number
        if (comps.input[index].data.isNumber) {
          value = Number(comps.input[index].data.value.val());
        }

        // Checkbox?
        else if (comps.input[index].data.isCheckbox) {
          value = comps.input[index].data.value.is(':checked');
        }

        // Normal mode
        else {
          value = comps.input[index].data.value.val();
        }

        // Validator
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          result = value;
          allowed = true;
        } else {
          result = null;
        }
      } catch (err) {
        console.error(err);
        result = null;
      }
    }

    // Blob data
    else if (comps.input[index].data.type === 'blob') {
      try {
        // The blob updater get is avaliable?
        if (typeof comps.input[index].data.value === 'function') {
          result = comps.input[index].data.value();
          allowed = true;
        }

        // Nope
        else {
          result = null;
        }
      } catch (err) {
        console.error(err);
        result = null;
      }
    }

    // This is checkbox group? This will read here on the array
    else if (comps.input[index].data.type === 'array') {
      if (
        Array.isArray(comps.input[index].data.value) &&
        comps.input[index].data.value.length > 0
      ) {
        // Data prepare
        const tinyArray = [];

        // Read input Array
        for (const vi in comps.input[index].data.value) {
          let value;

          try {
            if (
              Array.isArray(comps.input[index].data.value[vi]) &&
              comps.input[index].data.value[vi][0]
            ) {
              if (comps.input[index].data.value[vi][0].is(':checked')) {
                value = comps.input[index].data.value[vi][0].val();
                allowed = true;
              }
            } else if (comps.input[index].data.value[vi]) {
              if (comps.input[index].data.value[vi].is(':checked')) {
                value = comps.input[index].data.value[vi].val();
                allowed = true;
              }
            }
          } catch {
            value = null;
          }

          if (typeof value === 'string' && value.length > 0) {
            tinyArray.push(value);
          }
        }

        // Complete
        result = tinyArray;
      }
    }

    // Others. Invalid!
    else {
      result = null;
      console.log('Input Component', comps.input[index].depId, comps.input[index].data);
    }

    // Insert inputs result now
    inputs.push(result);
    console.log('Submit test item', comps.input[index], result);
  }

  return { inputs, allowed };
};

// Gradio Embed React
function GradioEmbed({ agiData, msgInfo, replyId }) {
  // Prepare Data
  const embedRef = useRef(null);
  const iframeRef = useRef(null);
  const [app, setApp] = useState(null);
  const [appError, setAppError] = useState(null);
  const [id, setId] = useState(null);

  const [isVisible, setIsVisible] = useState(0);

  // Temp
  const body = $('body');
  const getTheme = () =>
    body.hasClass('theme-type-dark') ||
    body.hasClass('theme-type-dark-solid') ||
    body.hasClass('theme-type-dark2') ||
    body.hasClass('theme-type-dark2-solid')
      ? 'dark'
      : 'light';

  useEffect(() => {
    if (!appError && embedRef.current) {
      try {
        // Error Sender
        const tinyError = (err) => {
          console.error(err);
          toast(err.message);
          setAppError(err);
        };

        // Get embed in jQuery
        const embed = $(embedRef.current);
        embed.removeClass('loading-gradio').removeClass('loading');
        embed.find('> #loading-place').remove();

        // Is Visible
        if (isVisible > 0) {
          // Load App
          if (!app) {
            embed
              .empty()
              .addClass('loading-gradio')
              .append(
                $('<center>', { id: 'loading-place' }).append(
                  $('<div>', { class: 'spinner-border', role: 'status' }).append(
                    $('<span>', { class: 'visually-hidden' }),
                  ),
                ),
              );

            client(agiData.url)
              .then((newApp) => setApp(newApp))
              .catch(tinyError);
          }

          // Get embed Id
          else if (id === null && objType(app, 'object') && objType(app.config, 'object')) {
            embed.empty();

            if (typeof app.config.space_id === 'string' && app.config.space_id.length > 0) {
              setId(app.config.space_id.replace('/', '_'));
            } else if (typeof app.config.root === 'string' && app.config.root.length > 0) {
              setId(
                app.config.root
                  .replace(/\//g, '_')
                  .replace(/\./g, '_')
                  .replace(/\-/g, '_')
                  .replace(/\:/g, '_')
                  .replace(/\-/g, '_'),
              );
            } else {
              setAppError(new Error('INVALID GRADIO EMBED ID!'));
            }
          }

          // Load Ydoc
          else {
            const selectedRoom = getRoomInfo().roomTimeline;
            selectedRoom.initYdoc();
            selectedRoom.ydocWait().then(() => {
              // The embed functions will start here...

              // This is the ymap to get embed data
              const ymap = () => selectedRoom.getYmap(id);

              // Insert Embed
              if (embed.find('gradio-embed').length < 1) {
                // Sync Updates will be sent here!
                let loadingUpdate = true;
                const syncUpdate = (tinyPromps, depId, where) => {
                  const props = clone(tinyPromps);
                  // console.log(tinyPromps, depId, where);
                  if (!loadingUpdate) ymap().set(String(depId), props);
                };

                // Build Embed first cache
                const embedCache = {};
                const config = app.config;

                // Read Template
                const embedData = new GradioLayout(
                  config,
                  `gradio-embed[space='${id}']`,
                  agiData.url,
                  id,
                  embedCache,
                );
                embedData.insertYdoc(ymap, 'ymap');

                // Prepare gradio tag in the html
                const page = $('<gradio-embed>', { class: 'text-center', space: id });
                embedData.insertHtml(page);
                // chatboxScrollToBottom();
                embed.append(page);

                const prepareEmbedsFunc = [];

                // Insert embed events
                const insertEmbedData = (root, compId) => {
                  try {
                    // Needs update
                    let needsUpdate = false;

                    // Value updater
                    const component = {
                      input: embedData.getInput(compId),
                      dropdown: embedData.getDropdown(compId),
                    };
                    const valueUpdater = (event) => {
                      // Target
                      const value = !component.input.isCheckbox
                        ? $(event.target).val()
                        : $(event.target).is(':checked');
                      const tinyData = embedData.getComponentValue(compId);
                      if (objType(tinyData, 'object')) {
                        // Insert Props
                        const props = tinyData.props;
                        if (objType(props, 'object')) {
                          // Insert new value
                          props.value =
                            typeof value === 'string' ||
                            typeof value === 'boolean' ||
                            typeof value === 'number'
                              ? !component.input.isNumber
                                ? value
                                : Number(value)
                              : null;

                          syncUpdate(props, compId, 'valueUpdater');
                        }
                      }
                    };

                    // Read component data
                    if (component.input) {
                      // jQuery
                      if (component.input.type === 'jquery') {
                        prepareEmbedsFunc.push(() =>
                          component.input.value.on('change', valueUpdater),
                        );
                        if (component.input.value2)
                          prepareEmbedsFunc.push(() =>
                            component.input.value2.on('change', valueUpdater),
                          );
                      }
                    }

                    // Dropdown
                    if (component.dropdown) {
                      if (component.dropdown.type === 'jquery') {
                        prepareEmbedsFunc.push(() =>
                          component.dropdown.value.on('change', valueUpdater),
                        );
                        if (component.dropdown.value2)
                          prepareEmbedsFunc.push(() =>
                            component.dropdown.value2.on('change', valueUpdater),
                          );
                      }
                    }

                    // Exist Default Data
                    const defaultData = embedData.getDefaultEmbedData(compId);
                    const defaultProps = defaultData?.data.props;
                    const tinyData = embedData.getComponentValue(compId);
                    const props = tinyData?.props;

                    // Validator
                    if (objType(props, 'object') && defaultData && defaultData?.data.props) {
                      // Get Data
                      const idData = ymap().get(compId);

                      // Insert Data
                      if (idData) {
                        // Update Data
                        needsUpdate = true;
                        for (const name in idData) {
                          if (name !== 'app_id' && name !== 'name') {
                            props[name] = idData[name];
                          }
                        }
                      }

                      // New
                      else if (objectHash(defaultProps) !== objectHash(props)) {
                        syncUpdate(props, compId, 'insertEmbedData');
                      }
                    }

                    // Complete
                    return needsUpdate;
                  } catch (err) {
                    console.error(err);
                    return false;
                  }
                };

                // Send Update
                const sendTinyUpdate = (
                  where,
                  output,
                  value,
                  dataset,
                  isSubmit = false,
                  subIndex = -1,
                  isLastSubIndex = false,
                  subResult = [],
                ) => {
                  if (
                    objType(output, 'object') &&
                    objType(output.data, 'object') &&
                    typeof value !== 'undefined' &&
                    // (value || value === null)
                    (typeof value === 'string' ||
                      typeof value === 'number' ||
                      typeof value === 'boolean')
                  ) {
                    // Preparing a url value
                    let tinyValue = value;
                    if (
                      value === null &&
                      dataset &&
                      (typeof dataset.index === 'string' || typeof dataset.index === 'number') &&
                      Array.isArray(dataset.props.samples) &&
                      Array.isArray(dataset.props.samples[dataset.index]) &&
                      typeof dataset.props.samples[dataset.index][0] === 'string'
                    ) {
                      tinyValue = `${dataset.props.samples[dataset.index][0].startsWith('/') ? fileUrlGenerator(config.root) : ''}${dataset.props.samples[dataset.index][0]}`;
                    }

                    // Get component data
                    const data = embedData.getComponentValue(output.depId);
                    const input = embedData.getInput(output.depId);
                    const dropdown = embedData.getDropdown(output.depId);

                    // Insert value and send update
                    if (objType(input, 'object')) {
                      data.props.value = tinyValue;
                      syncUpdate(data.props, output.depId, `sendTinyUpdate_${where}`);
                      updateInputValue(input, dropdown, tinyValue);
                    }
                  }

                  // Insert Database
                  const insertDataset = (tinyIndex, compValue, type, component) => {
                    const data = embedData.getComponentValue(component);
                    const input = embedData.getInput(component);
                    const dropdown = embedData.getDropdown(component);
                    // console.log(backendFn, input, data);

                    if (objType(input, 'object')) {
                      data.props.value = compValue;
                      syncUpdate(data.props, component, 'insertDataset');
                      updateInputValue(input, dropdown, compValue, fileUrlGenerator(config.root));
                    }
                  };

                  // Dataset
                  if (dataset && Array.isArray(dataset.props.samples)) {
                    const sample = dataset.props.samples[dataset.index];
                    if (sample) {
                      // Using Component Id
                      if (
                        Array.isArray(dataset.props.component_ids) &&
                        dataset.props.component_ids.length > 0
                      ) {
                        for (const tinyIndex in dataset.props.component_ids) {
                          const compId = dataset.props.component_ids[tinyIndex];
                          const component = embedData.getComponent(compId);

                          insertDataset(
                            tinyIndex,
                            sample[tinyIndex],
                            dataset.props.components[tinyIndex],
                            component,
                          );
                        }
                      }

                      // Plan B
                      else if (
                        Array.isArray(dataset.props.components) &&
                        dataset.props.components.length > 0
                      ) {
                        for (const tinyIndex in dataset.props.components) {
                          // Get Values
                          const comp = dataset.props.components[tinyIndex];
                          const val = sample[tinyIndex];
                          const component = output.data.value;

                          // Compare
                          if (comp === output.data.type) {
                            insertDataset(tinyIndex, val, comp, component);
                          }
                        }
                      }
                    }
                  }

                  // Output send result
                  if (isSubmit) {
                    const embedValues = embedData.getComponentValue(output.depId);
                    if (objType(embedValues, 'object') && objType(embedValues.props, 'object')) {
                      // Object
                      if (objType(value, 'object') && objType(value.value, 'object')) {
                        for (const item in value) {
                          if (
                            typeof value[item] === 'string' ||
                            typeof value[item] === 'number' ||
                            typeof value[item] === 'boolean'
                          ) {
                            embedValues.props[item] = value[item];
                          }
                        }
                      }

                      // Gallery Value
                      else if (embedValues.props.name === 'gallery') {
                        subResult.push({ name: value });
                      }

                      // Normal Value
                      else if (
                        typeof value === 'string' ||
                        typeof value === 'number' ||
                        typeof value === 'boolean'
                      ) {
                        embedValues.props.value = value;
                        syncUpdate(embedValues.props, output.depId, 'isSubmit');
                      }
                    }

                    // console.log(subIndex, isLastSubIndex, subResult);

                    // Complete
                    if (subIndex < 0) {
                      embedData.updateEmbed();
                      console.log('Tiny Update', output, value, dataset);
                    }

                    // Complete 2
                    else if (isLastSubIndex) {
                      embedValues.props.value = subResult;
                      syncUpdate(embedValues.props, output.depId, 'isLastSubIndex');
                    }
                  }
                };

                // Submit
                const tinySubmit = (comps, tinyIndex) => {
                  // Get input values
                  const subData = getInputValues(comps);
                  if (subData.allowed) {
                    // https://www.gradio.app/docs/js-client#submit
                    const submitName = comps.api_name ? `/${comps.api_name}` : Number(tinyIndex);

                    console.log('Submit test', submitName, comps, subData.inputs);
                    setLoadingPage('Starting gradio...');
                    const job = app.submit(submitName, subData.inputs);

                    // Sockets
                    job.on('data', (data) => {
                      // Convert to momentjs
                      console.log('Data', data);
                      data.time = moment(data.time);

                      // Data
                      if (Array.isArray(data.data) && data.data.length > 0) {
                        for (const item in data.data) {
                          const finalResultSend = (
                            tinyData,
                            index,
                            subIndex = -1,
                            isLastSubIndex = false,
                            subResult = [],
                          ) => {
                            const value = objType(tinyData, 'object')
                              ? typeof tinyData.name === 'string' && tinyData.is_file
                                ? `${fileUrlGenerator(agiData.url)}${tinyData.name}`
                                : typeof tinyData.data === 'string' && tinyData.is_file
                                  ? tinyData.data
                                  : objType(tinyData.value, 'object')
                                    ? tinyData
                                    : null
                              : typeof tinyData === 'string'
                                ? tinyData
                                : null;

                            sendTinyUpdate(
                              'jobData',
                              comps.output[index],
                              value,
                              null,
                              true,
                              subIndex,
                              isLastSubIndex,
                              subResult,
                            );
                          };

                          if (Array.isArray(data.data[item]) && data.data[item].length > 0) {
                            const subResult = [];
                            for (const index in data.data[item]) {
                              finalResultSend(
                                data.data[item][index],
                                item,
                                index,
                                index >= data.data[item].length - 1,
                                subResult,
                              );
                            }
                          } else {
                            finalResultSend(data.data[item], item);
                          }
                        }
                      }
                    });

                    // The submit job status is sent here
                    job.on('status', (data) => {
                      // Convert to momentjs
                      data.time = moment(data.time);

                      // Queue
                      if (data.queue) {
                        setLoadingPage('Queue...');
                      }

                      // Pending
                      if (data.stage === 'pending') {
                        setLoadingPage('Pending...');
                      }

                      // Complete
                      else if (data.stage === 'complete') {
                        // Success?
                        setLoadingPage(false);
                        if (data.success) {
                        }
                      }

                      // Error
                      else if (data.stage === 'error') {
                        setLoadingPage(false);
                        toast(data.message);
                        console.error(data.message, data.code);
                      }

                      // Generating
                      else if (data.stage === 'generating') {
                        setLoadingPage('Generating...');
                      }
                    });
                  }
                };

                embedCache.genDeps = (item) => {
                  // Prepare values
                  const depItem = config.dependencies[item];
                  const comps = { output: [], input: [], cancel: [] };

                  // Get Js Values in the gradio app json
                  if (typeof depItem.js === 'string' && depItem.js.length > 0) {
                    try {
                      if (
                        depItem.js.startsWith(`() => { window.open(\``) &&
                        depItem.js.endsWith(`\`, '_blank') }`)
                      ) {
                        depItem.js = { openUrl: depItem.js.substring(21, depItem.js.length - 14) };
                      } else {
                        depItem.js = JSON.parse(depItem.js.trim().replace('() => ', ''));
                      }
                    } catch (err) {
                      console.error(err, depItem.js);
                      depItem.js = null;
                    }
                  } else {
                    depItem.js = null;
                  }

                  // Action Base
                  const tinyAction = function (depId, dataId) {
                    // Outputs list
                    // console.log(clone(getInputValues(comps)));
                    const dataset = config.components.find((comp) => comp.id === depId);
                    for (const index in comps.output) {
                      sendTinyUpdate(
                        'tinyAction',
                        comps.output[index],
                        Array.isArray(depItem.js) && typeof depItem.js[index] !== 'undefined'
                          ? depItem.js[index]
                          : null,
                        objType(dataset, 'object') && objType(dataset.props, 'object')
                          ? {
                              props: dataset.props,
                              index:
                                Array.isArray(dataset.props.headers) &&
                                dataset.props.headers.length > 1
                                  ? dataId - 1
                                  : dataId,
                            }
                          : null,
                      );
                    }

                    // Cancel Parts
                    for (const index in comps.cancel) {
                      // console.log('Cancel Component', comps.cancel[index].depId, comps.cancel[index].data);
                    }

                    if (comps.scroll_to_output) {
                    }

                    if (comps.show_progress !== 'hidden') {
                    }

                    if (comps.trigger_only_on_success) {
                    }

                    if (comps.trigger_after) {
                    }

                    if (comps.collects_event_data) {
                    }

                    // Inputs list
                    if (comps.backend_fn) tinySubmit(comps, item);
                  };

                  // Inputs list
                  if (Array.isArray(depItem.inputs) && depItem.inputs.length > 0) {
                    for (const index in depItem.inputs) {
                      const depId = depItem.inputs[index];
                      comps.input.push({ depId, data: embedData.getInput(depId) });
                    }
                  }

                  // Outputs list
                  if (Array.isArray(depItem.outputs) && depItem.outputs.length > 0) {
                    for (const index in depItem.outputs) {
                      const depId = depItem.outputs[index];
                      comps.output.push({ depId, data: embedData.getComponent(depId) });
                    }
                  }

                  // Cancel Parts
                  if (Array.isArray(depItem.cancels) && depItem.cancels.length > 0) {
                    for (const index in depItem.cancels) {
                      const depId = depItem.cancels[index];
                      comps.cancel.push({ depId, data: embedData.getComponent(depId) });
                    }
                  }

                  // Insert comps values
                  comps.show_progress = depItem.show_progress;
                  comps.trigger_only_on_success = depItem.trigger_only_on_success;
                  comps.trigger_after = depItem.trigger_after;
                  comps.collects_event_data = depItem.collects_event_data;
                  comps.backend_fn = depItem.backend_fn;

                  // When clicking on something on the embed, this will be executed here.
                  const clickAction = (target, type, depId, outputs, triggerAfter) => {
                    console.log('Target', type, target, depId);
                    // if (!triggerAfter) {

                    const executeArray = (value, targetType, input, targetId) => {
                      // jQuery
                      if (targetType === 'jquery') {
                        value.on(type, () => tinyAction(depId, targetId, outputs));
                      } else if (targetType === 'blob') {
                        input.on('change', () => tinyAction(depId, targetId, outputs));
                      }

                      // Array
                      else if (targetType === 'array') {
                        for (const item2 in value) {
                          // Mode 1
                          if (!Array.isArray(value[item2])) {
                            value[item2].on(type, () => tinyAction(depId, item2, outputs));
                          }

                          // Mode 2
                          else {
                            for (const item3 in value[item2]) {
                              executeArray(
                                value[item2][item3],
                                'jquery',
                                input,
                                value.length < 2 ? item3 : item2,
                              );
                            }
                          }
                        }
                      }
                    };

                    executeArray(target.value, target.type, target.input);

                    // }
                  };

                  // Trigger
                  const trigger = config.dependencies[item].trigger;

                  // Target to execute the action
                  if (Array.isArray(depItem.targets) && depItem.targets.length > 0) {
                    for (const index in depItem.targets) {
                      // String
                      if (typeof trigger === 'string') {
                        // Get Id
                        const depId = depItem.targets[index];
                        let target = embedData.getTarget(depId);
                        if (!target) target = embedData.getInput(depId);
                        if (target) {
                          // Click
                          if (trigger === 'click') {
                            clickAction(target, 'click', depId, depItem.outputs);
                          }

                          // Change
                          else if (trigger === 'change') {
                            clickAction(target, 'change', depId, depItem.outputs);
                          }

                          // Then
                          else if (
                            trigger === 'then' ||
                            trigger === 'upload' ||
                            trigger === 'select'
                          ) {
                            console.log(
                              `Input "${trigger}"`,
                              target,
                              depId,
                              depItem.outputs,
                              config.dependencies[item].trigger_after,
                            );
                            clickAction(
                              target,
                              'change',
                              depId,
                              depItem.outputs,
                              config.dependencies[item].trigger_after,
                            );
                          }
                        }
                      }

                      // Array
                      else if (
                        Array.isArray(depItem.targets[index]) &&
                        depItem.targets[index].length > 0
                      ) {
                        if (
                          typeof depItem.targets[index][0] === 'number' &&
                          typeof depItem.targets[index][1] === 'string'
                        ) {
                          // Get Id
                          const depId = depItem.targets[index][0];
                          let target = embedData.getTarget(depId);
                          if (!target) target = embedData.getInput(depId);
                          if (target) {
                            // Click
                            if (depItem.targets[index][1] === 'click') {
                              clickAction(target, 'click', depId, depItem.outputs);
                            }

                            // Change
                            else if (depItem.targets[index][1] === 'change') {
                              clickAction(target, 'change', depId, depItem.outputs);
                            }

                            // Then
                            else if (
                              depItem.targets[index][1] === 'then' ||
                              depItem.targets[index][1] === 'upload' ||
                              depItem.targets[index][1] === 'select'
                            ) {
                              console.log(
                                `Input "${depItem.targets[index][1]}"`,
                                target,
                                depId,
                                depItem.outputs,
                                config.dependencies[item].trigger_after,
                              );
                              clickAction(
                                target,
                                'change',
                                depId,
                                depItem.outputs,
                                config.dependencies[item].trigger_after,
                              );
                            }
                          }
                        }
                      }
                    }
                  }
                };

                // Read dependencies
                if (Array.isArray(config.dependencies) && config.dependencies.length > 0) {
                  for (const item in config.dependencies) {
                    embedCache.genDeps(item);
                  }
                }

                // Read Embed Data
                const needsUpdate = embedData.readEmbedData(insertEmbedData);

                if (needsUpdate) {
                  embedData.updateEmbed();
                }

                // Reset embed
                embed.append(
                  $('<center>', { class: 'mt-3' }).append(
                    $('<button>', { class: 'btn btn-danger' })
                      .text('Reset gradio session')
                      .on('click', async () => {
                        const isConfirmed = await tinyConfirm(
                          'Are you sure? All data from this Gradio Embed will be lost.',
                        );
                        if (isConfirmed) {
                          ymap().clear();
                          alert('The gradio embed has been successfully reset.');
                          setIsVisible(0);
                        }
                      }),
                  ),
                );

                // Insert embeds function
                for (const item in prepareEmbedsFunc) {
                  prepareEmbedsFunc[item]();
                }

                // Complete
                // console.log(id, config);
                loadingUpdate = false;
                return () => {
                  if (app && typeof app.destroy === 'function') app.destroy();
                  page.remove();
                };
              }
            });
          }
        }

        // Error
        else if (isVisible < 0) {
          embed
            .empty()
            .addClass('error')
            .append($('<center>').append($('<div>').text('ERROR!')));
        }

        // Nope
        else if (embed.length > 0) {
          embed
            .empty()
            .addClass('loading')
            .append(
              $('<center>').append(
                $('<i>', { class: 'fa-solid fa-play' }).on('click', () => setIsVisible(1)),
                $('<div>').append(
                  $('<a>', { href: agiData.url, target: '_blank' })
                    .on('click', (event) => {
                      const e = event.originalEvent;
                      e.preventDefault();
                      openTinyURL(
                        $(event.currentTarget).attr('href'),
                        $(event.currentTarget).attr('href'),
                      );
                      return false;
                    })
                    .text(agiData.url),
                ),
              ),
            );
        }
      } catch (err) {
        setIsVisible(-1);
        console.error(err);
        toast(err.message);
      }
    }
  });

  // iFrame communication
  useEffect(() => {
    if (iframeRef.current) {
      // Iframe messages to test here.
      const iframeMessage = (message) => {
        if (message.source !== iframeRef.current.contentWindow) {
          console.log(`[${agiData.url}]`, message.data);
        }
      };

      // If the user changes the client theme, we will notify the iframe that this has happened.
      const iframeTheme = (index, newTheme) => {
        if (iframeRef.current) {
          iframeRef.current.contentWindow.postMessage({ theme: getTheme() });
        }
      };

      // Iframe Functions. All iframe events will be detected here.
      window.addEventListener('message', iframeMessage);
      settings.on(cons.events.settings.THEME_APPLIED, iframeTheme);
      return () => {
        settings.off(cons.events.settings.THEME_APPLIED, iframeTheme);
        window.removeEventListener('message', iframeMessage);
      };
    }
  });

  useEffect(() => tinyFixScrollChat());

  // Temp result. (I'm using this only to have a preview. This will be removed later.)
  return (
    <div>
      <Iframe
        ref={iframeRef}
        src={`${agiData.url}${!agiData.url.endsWith('/') ? '/' : ''}?room_id=${encodeURIComponent(msgInfo.roomId)}&msg_id=${encodeURIComponent(msgInfo.eventId)}&owner_id=${encodeURIComponent(msgInfo.senderId)}&user_id=${encodeURIComponent(initMatrix.matrixClient.getUserId())}${replyId ? `&reply_id=${encodeURIComponent(replyId)}` : ''}&theme=${getTheme()}`}
        style={{ height: '500px', width: '100%' }}
        title="Gradio"
      />

      <div className="card">
        <div className="card-body">
          <a
            href="#"
            className="btn btn-primary"
            onClick={(event) => {
              initMatrix.matrixClient.sendMessage(msgInfo.roomId, {
                body: `.demo ${agiData.url} ${msgInfo.eventId}`,
                external_url: agiData.url,
                format: 'org.matrix.custom.html',
                formatted_body: `.demo ${agiData.url} ${msgInfo.eventId}`,
                msgtype: 'm.text',
              });

              event.preventDefault();
            }}
          >
            Clone Space
          </a>
        </div>
      </div>
    </div>
  );
  // return <gradio-app src={agiData.url} theme_mode={getTheme()} autoscroll />;

  // The original gradio sandbox of the gradioLayout.js
  // return <div ref={embedRef} className='mt-2 agi-client-embed chatbox-size-fix border border-bg p-4' />;
}

export default GradioEmbed;

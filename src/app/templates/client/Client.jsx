import React, { useState, useEffect, useRef } from 'react';

import { initHotkeys } from '../../../client/event/hotkeys';
import { initRoomListListener } from '../../../client/event/roomList';

import Text from '../../atoms/text/Text';
import Spinner from '../../atoms/spinner/Spinner';
import Navigation from '../../organisms/navigation/Navigation';
import ContextMenu, { MenuItem } from '../../atoms/context-menu/ContextMenu';
import IconButton from '../../atoms/button/IconButton';
import ReusableContextMenu from '../../atoms/context-menu/ReusableContextMenu';
import Room from '../../organisms/room/Room';
import Windows from '../../organisms/pw/Windows';
import Dialogs from '../../organisms/pw/Dialogs';
import EmojiBoardOpener from '../../organisms/emoji-board/EmojiBoardOpener';

import initMatrix from '../../../client/initMatrix';
import navigation from '../../../client/state/navigation';
import cons from '../../../client/state/cons';
import DragDrop from './DragDrop';
import { btModal, dice, resizeWindowChecker, scrollFixer, tinyAppZoomValidator } from '../../../util/tools';
import { startUserAfk, stopUserAfk } from '../../../util/userStatusEffects';
import Mods from './Mods';
import appLoadMsg from '../../../../mods/appLoadMsg';
import LoadingPage from './Loading';

let versionChecked = false;

if (__ENV_APP__.electron_mode) {
  window.setElectronResize(() => resizeWindowChecker());
}

function Client() {
  const [isLoading, changeLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(appLoadMsg.en.items[dice(appLoadMsg.en.items.length) - 1]);

  const navWrapperRef = useRef(null);

  function onRoomModeSelected(roomType) {

    const navWrapper = $(navWrapperRef.current);
    navWrapper.removeClass('room-mode').removeClass('navigation-mode');

    if (roomType === 'room') navWrapper.addClass('room-mode');
    if (roomType === 'navigation') navWrapper.addClass('navigation-mode');
    resizeWindowChecker();

  }

  useEffect(() => {

    startUserAfk();
    navigation.on(cons.events.navigation.SELECTED_ROOM_MODE, onRoomModeSelected);
    const keypressDetector = (event) => {

      const e = event.originalEvent;

      const body = $('body');

      if (e.shiftKey) {
        body.addClass('shiftKey');
      } else {
        body.removeClass('shiftKey');
      }


      if (e.ctrlKey) {
        body.addClass('ctrlKey');
      } else {
        body.removeClass('ctrlKey');
      }

    };

    $(window).on('resize', resizeWindowChecker).on('mousewheel', scrollFixer).on('keypress keyup keydown', keypressDetector);

    return (() => {
      stopUserAfk();
      $(window).off('resize', resizeWindowChecker).on('mousewheel', scrollFixer).off('keypress keyup keydown', keypressDetector);
      navigation.removeListener(cons.events.navigation.SELECTED_ROOM_MODE, onRoomModeSelected);
    });

  }, []);

  useEffect(() => {

    let counter = -1;
    let counter2 = -1;

    const iId = setInterval(() => {

      if (counter2 !== 2) {

        counter2 += 1;
        setLoadingMsg(appLoadMsg.en.items[dice(appLoadMsg.en.items.length) - 1]);

      } else {

        counter += 1;

        if (counter === 3) {
          setLoadingMsg(appLoadMsg.en.loading[appLoadMsg.en.loading.length - 1]);
          clearInterval(iId);
          return;
        }

        setLoadingMsg(appLoadMsg.en.loading[counter]);

      }

    }, 15000);

    initMatrix.once('init_loading_finished', () => {
      clearInterval(iId);
      initHotkeys();
      initRoomListListener(initMatrix.roomList);
      changeLoading(false);
    });

    initMatrix.init();

  }, []);

  if (isLoading) {
    return (
      <div className="loading-display">
        <div className="loading__menu">
          <ContextMenu
            placement="bottom"
            content={(
              <>
                <MenuItem onClick={() => initMatrix.clearCacheAndReload()}>
                  Clear cache & reload
                </MenuItem>
                <MenuItem onClick={() => initMatrix.logout()}>Logout</MenuItem>
              </>
            )}
            render={(toggle) => <IconButton size="extra-small" onClick={toggle} fa="bi bi-three-dots-vertical" />}
          />
        </div>
        <Spinner />
        <div className='very-small fw-bold text-uppercase mt-3'>Did you know</div>
        <p className="loading__message small">{loadingMsg}</p>

        <div className="loading__appname">
          <Text variant="h2" weight="medium">{__ENV_APP__.info.name}</Text>
        </div>
      </div>
    );
  }

  if (__ENV_APP__.electron_mode && !versionChecked && global.checkVersions) {
    versionChecked = true;
    global.checkVersions().then(versionData => {
      if (versionData && typeof versionData.value.name === 'string' && versionData.result === 1) {
        const tinyUrl = `https://github.com/agifm-team/AGI-Client/releases/tag/${versionData.value.name}`;
        const tinyModal = btModal({

          id: 'tiny-update-warn',
          title: `New version available!`,

          dialog: 'modal-dialog-centered modal-lg',
          body: [
            $('<p>', { class: 'small' }).text(`Version ${versionData.value.name} of the app is now available for download! Click the button below to be sent to the update page.`),
            $('<center>').append(
              $('<a>', { href: tinyUrl, class: 'btn btn-primary text-bg-force' }).on('click', () => {
                global.open(tinyUrl, '_target');
                tinyModal.hide();
                return false;
              }).text('Open download page')
            ),
          ],

        });
      }
    }).catch(err => {
      console.error(err);
      alert(err.message);
    });
  }

  $('body').css('zoom', `${tinyAppZoomValidator(Number(global.localStorage.getItem('pony-house-zoom')))}%`);
  const tinyMod = <Mods />;

  resizeWindowChecker();
  return <>
    <LoadingPage />
    {tinyMod}
    <DragDrop navWrapperRef={navWrapperRef} >
      <div className="navigation-wrapper">
        <Navigation />
      </div>
      <div className='room-wrapper'>
        <Room />
      </div>
      <Windows />
      <Dialogs />
      <EmojiBoardOpener />
      <ReusableContextMenu />
    </DragDrop>
  </>;
}

export default Client;

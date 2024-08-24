import React, { useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'matrix-js-sdk';
import { generateApiKey } from 'generate-api-key';

import tinyAPI from '@src/util/mods';
import initMatrix from '@src/client/initMatrix';
import Checkbox from '@src/app/atoms/button/Checkbox';
import Button from '@src/app/atoms/button/Button';
function OpenRouterTab({ userId, roomId, agentData }) {
  // Prepare
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [botSetting, setBotSetting] = useState(null);

  const [isBotDisabled, setIsBotDisabled] = useState(null);
  const [botPrompt, setBotPrompt] = useState(null);

  const promptForm = useRef(null);

  useEffect(() => {
    if (!isLoading && isEmpty && !isError) {
      setIsLoading(true);
      initMatrix.matrixClient
        .sendEvent(roomId, 'openrouter.settings.get', {
          request_id: generateApiKey(),
        })
        .catch((err) => {
          console.error(err);
          alert(err.message, 'Error Get Open Router');
          isError(true);
          setIsLoading(false);
        });
    }

    const getData = (mEvent, room) => {
      if (
        room.roomId !== roomId ||
        mEvent.getSender() !== userId ||
        mEvent.isRedaction() ||
        mEvent.getType() !== 'm.room.message'
      )
        return;
      const content = mEvent.getContent();
      if (
        content.msgtype !== 'm.openrouter.request' ||
        !content.account_data ||
        !content.account_data.value ||
        content.account_data.type !== 'open_router.bot.settings'
      )
        return;

      setIsEmpty(false);
      setBotSetting(content.account_data.value);
      setIsLoading(false);
    };
    initMatrix.matrixClient.on(RoomEvent.Timeline, getData);
    return () => {
      initMatrix.matrixClient.off(RoomEvent.Timeline, getData);
    };
  });

  useEffect(() => {
    if (botSetting && promptForm.current) {
      $(promptForm.current).val(botPrompt);
    }
  });

  // Is Loading
  if (isLoading)
    return (
      <strong className="small">
        <div className="me-2 spinner-border spinner-border-sm d-inline-block" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>{' '}
        Loading data...
      </strong>
    );

  // Is Error
  if (isError) return <strong className="small text-danger">ERROR LOADING!</strong>;

  // Empty
  if (!botSetting) return <strong className="small">No bot data found to change.</strong>;

  // Fix Data
  if (isBotDisabled === null && botSetting && botSetting.disabled !== isBotDisabled)
    setIsBotDisabled(botSetting.disabled);
  if (botPrompt === null && botSetting && botSetting.prompt !== botPrompt)
    setBotPrompt(botSetting.prompt);

  // Complete
  return (
    <>
      <div>
        <label htmlFor="promptForm" className="form-label">
          Prompt
        </label>
        <textarea
          promptForm={promptForm}
          className="form-control form-control-bg"
          id="promptForm"
          rows="5"
        ></textarea>
      </div>

      <div className="mt-2">
        <input
          className="form-check-input"
          type="checkbox"
          id="disabledOpenRouterBot"
          onChange={(event) => setIsBotDisabled(event.target.checked)}
        />
        <label className="form-check-label ms-2" htmlFor="disabledOpenRouterBot">
          Disabled bot
        </label>
      </div>

      <Button className="mt-2" variant="primary" onClick={() => {}}>
        Update bot
      </Button>
    </>
  );
}

export default function startOpenRouterTabs() {
  tinyAPI.on(
    'profileTabsSpawn',
    (data, menuBarItems, accountContent, existEthereum, userId, roomId, agentData) => {
      /* if (
        agentData &&
        agentData.data &&
        typeof agentData.data.id === 'string' &&
        agentData.data.id.length > 0
      ) { */
      menuBarItems.unshift({
        menu: () => 'Bot Settings',
        render: ({ userId, accountContent }) => (
          <OpenRouterTab userId={userId} roomId={roomId} agentData={agentData} />
        ),
      });
      // }
    },
  );
}

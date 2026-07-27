import { useBattleWebSocket } from '../../hooks/useBattleWebSocket';

interface BattleEventLogProps {
  battleId?: string;
}

export function BattleEventLog({ battleId }: BattleEventLogProps) {
  const { connected, events, subscribe, clearEvents } = useBattleWebSocket();

  if (battleId) {
    subscribe(battleId);
  }

  const battleEvents = events.filter((e) => e.type === 'event');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a4a]">
        <span className="text-xs font-medium text-gray-400 uppercase">Live Events</span>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <button onClick={clearEvents} className="text-xs text-gray-500 hover:text-white">
            Clear
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs">
        {battleEvents.length === 0 ? (
          <div className="p-3 text-gray-500">
            {connected ? 'Waiting for events…' : 'Connecting…'}
          </div>
        ) : (
          battleEvents.map((event, i) => (
            <div key={i} className="px-3 py-1 border-b border-[#2a2a4a]/50 hover:bg-[#2a2a4a]/30">
              <span className="text-gray-500">
                {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}
              </span>{' '}
              <span className={
                event.eventType === 'ActionExecuted' ? 'text-green-400' :
                event.eventType === 'ActionRejected' ? 'text-red-400' :
                event.eventType === 'TurnStarted' ? 'text-blue-400' :
                event.eventType === 'TurnFinished' ? 'text-blue-300' :
                event.eventType === 'WinConditionMet' ? 'text-yellow-400' :
                'text-gray-300'
              }>
                {event.eventType}
              </span>
              {event.payload != null && (
                <span className="text-gray-500 ml-2">
                  {typeof event.payload === 'object'
                    ? JSON.stringify(event.payload).slice(0, 80)
                    : String(event.payload).slice(0, 80)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
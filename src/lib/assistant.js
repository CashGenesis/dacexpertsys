// Lets layouts open the global DAC assistant panel (DacChatbot) from their own buttons.
export const OPEN_ASSISTANT_EVENT = 'dac-assistant:toggle';

export function toggleAssistant() {
  window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT));
}

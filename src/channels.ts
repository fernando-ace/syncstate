export const channels = {
  get: "electron-global-state:get",
  set: "electron-global-state:set",
  subscribe: "electron-global-state:subscribe",
  unsubscribe: "electron-global-state:unsubscribe",
  update: "electron-global-state:update"
} as const;

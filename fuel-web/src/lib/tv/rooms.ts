/** Socket.IO room names. One place so server and routes never drift. */
export const tvRoom = (deviceId: string) => `tv:${deviceId}`;
export const adminBranchRoom = (branchId: string) => `admin:branch:${branchId}`;
export const pairingRoom = (code: string) => `pairing:${code}`;

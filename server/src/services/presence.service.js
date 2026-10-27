// In-memory presence registry. It is intentionally ephemeral;
// MongoDB remains the source of truth for user accounts.
export const onlineUsers = new Map();

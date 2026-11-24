const PREFIX = "bobu:ares:checkpoint:v1:";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const uuid = value =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const finite = value =>
  typeof value === "number" && Number.isFinite(value);

const point = value =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every(n => finite(n) && Math.abs(n) < 6350);

export function validateAresCheckpoint(value, owner, now = Date.now()) {
  if (!uuid(owner) || !value || typeof value !== "object") return null;

  if (
    value.version !== 1 ||
    value.owner !== owner ||
    value.mode !== "walking" ||
    !finite(value.savedAt) ||
    value.savedAt > now ||
    now - value.savedAt > MAX_AGE ||
    !point(value.position) ||
    !finite(value.yaw) ||
    !finite(value.cameraYaw) ||
    !finite(value.cameraPitch) ||
    value.cameraPitch < 8 * Math.PI / 180 ||
    value.cameraPitch > 68 * Math.PI / 180
  ) return null;

  let parkedShip = null;

  if (value.parkedShip !== null) {
    const ship = value.parkedShip;

    if (
      !ship ||
      !point(ship.spawn) ||
      !point(ship.ship) ||
      !finite(ship.yaw)
    ) return null;

    parkedShip = {
      spawn: [...ship.spawn],
      ship: [...ship.ship],
      yaw: ship.yaw
    };
  }

  return {
    version: 1,
    owner,
    mode: "walking",
    savedAt: value.savedAt,
    position: [...value.position],
    yaw: value.yaw,
    cameraYaw: value.cameraYaw,
    cameraPitch: value.cameraPitch,
    parkedShip
  };
}

export function saveAresCheckpoint(storage, owner, value) {
  try {
    const safe = validateAresCheckpoint(value, owner);
    if (!safe) return false;

    storage.setItem(PREFIX + owner, JSON.stringify(safe));
    return true;
  } catch {
    return false;
  }
}

export function readAresCheckpoint(storage, owner) {
  if (!uuid(owner)) return null;

  try {
    const raw = storage.getItem(PREFIX + owner);
    if (!raw || raw.length > 4096) return null;

    return validateAresCheckpoint(JSON.parse(raw), owner);
  } catch {
    return null;
  }
}

export function clearAresCheckpoint(storage, owner) {
  if (!uuid(owner)) return false;

  try {
    storage.removeItem(PREFIX + owner);
    return true;
  } catch {
    return false;
  }
}

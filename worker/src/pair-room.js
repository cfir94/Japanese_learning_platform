// A two-person room stores progress summaries only. Personal answers stay in jp_events.
const STATUS = new Set(['known', 'partial', 'gap', 'pending', 'new', 'untested']);
const count = (value, max = 1_000_000) => Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;

export function cleanSnapshot(value, role) {
  const snapshot = { updatedAt: new Date().toISOString(), role };
  if (role === 'kfir') {
    const grammar = {};
    for (const [key, status] of Object.entries(value?.grammar ?? {}).slice(0, 120)) {
      if (/^g\d{2}-\d+$/.test(key) && STATUS.has(status)) grammar[key] = status;
    }
    const tasks = {};
    for (const [key, done] of Object.entries(value?.tasks ?? {}).slice(0, 2000)) {
      if (/^w\d{2}-d\d-[a-z]+$/.test(key) && typeof done === 'boolean') tasks[key] = done;
    }
    snapshot.grammar = grammar;
    snapshot.tasks = tasks;
    snapshot.pace = Object.fromEntries(['totalDays', 'passed', 'doneDays', 'behind', 'minutesPlanned', 'minutesDone'].map((key) => [key, count(value?.pace?.[key])]));
  } else {
    snapshot.units = {};
    for (const [key, data] of Object.entries(value?.units ?? {}).slice(0, 40)) {
      if (!/^en-\d{2}$/.test(key)) continue;
      snapshot.units[key] = { done: Boolean(data?.done), attempts: count(data?.attempts), words: count(data?.words) };
    }
    snapshot.attempts = count(value?.attempts);
    snapshot.words = count(value?.words);
  }
  return snapshot;
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export class ProgressRoom {
  constructor(state) { this.state = state; }

  async fetch(request) {
    return this.state.blockConcurrencyWhile(async () => {
      const userId = request.headers.get('X-Learner-ID');
      if (!userId) return response({ error: 'unauthorized' }, 401);
      const body = await request.json();
      let room = await this.state.storage.get('room');
      if (body.action === 'create') {
        if (room) return response({ error: 'room_exists' }, 409);
        room = { members: [{ id: userId, role: 'kfir' }], snapshots: {}, closed: false };
        await this.state.storage.put('room', room);
      }
      if (!room || room.closed) return response({ error: 'room_closed' }, 404);
      let member = room.members.find((person) => person.id === userId);
      if (body.action === 'join' && !member) {
        if (room.members.length >= 2) return response({ error: 'room_full' }, 409);
        member = { id: userId, role: 'masami' };
        room.members.push(member);
        await this.state.storage.put('room', room);
      }
      if (!member) return response({ error: 'not_a_member' }, 403);
      if (body.action === 'update') {
        room.snapshots[member.role] = cleanSnapshot(body.snapshot, member.role);
        await this.state.storage.put('room', room);
      } else if (body.action === 'leave') {
        await this.state.storage.put('room', { closed: true });
        return response({ disconnected: true });
      }
      return response({ role: member.role, connected: room.members.length === 2, snapshots: room.snapshots });
    });
  }
}

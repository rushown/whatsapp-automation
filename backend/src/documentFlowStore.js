const { v4: uuidv4 } = require('uuid');

const flows = [];
const sessions = new Map();

module.exports = {
  getAllFlows: () => flows,
  getFlow: (id) => flows.find((f) => f.id === id),
  createFlow: (data) => {
    const flow = { id: uuidv4(), ...data, createdAt: new Date().toISOString() };
    flows.push(flow);
    return flow;
  },
  updateFlow: (id, data) => {
    const i = flows.findIndex((f) => f.id === id);
    if (i < 0) return null;
    flows[i] = { ...flows[i], ...data };
    return flows[i];
  },
  deleteFlow: (id) => {
    const i = flows.findIndex((f) => f.id === id);
    if (i < 0) return false;
    flows.splice(i, 1);
    return true;
  },
  getSession: (phone) => sessions.get(phone),
  createSession: (phone, flowId) => {
    const s = { phone, flowId, status: 'collecting', data: {}, lang: 'en' };
    sessions.set(phone, s);
    return s;
  },
  updateSession: (phone, patch) => {
    const s = sessions.get(phone);
    if (!s) return null;
    Object.assign(s, patch);
    return s;
  },
  deleteSession: (phone) => sessions.delete(phone),
  findFlowByKeyword: (text) => {
    const t = text.toLowerCase();
    return flows.find(
      (f) =>
        f.active &&
        (f.triggerKeywords || []).some((k) => t.includes(k.toLowerCase()))
    );
  },
};

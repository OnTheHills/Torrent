const torMatching = require("@/jobs/matchTors");

async function startMatchScheduler() {
  // Resume TOR-specific jobs saved before a restart. Historical TORs are not
  // bulk-enqueued; a job is created only when an individual TOR changes.
  torMatching.kick();
}

module.exports = { startMatchScheduler };

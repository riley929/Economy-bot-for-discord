const queue = [];
let running = 0;

const MAX_CONCURRENT = 3;
const DELAY_BETWEEN_TASKS = 350;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processQueue() {
  if (running >= MAX_CONCURRENT) return;

  const job = queue.shift();
  if (!job) return;

  running++;

  try {
    await job();
  } catch (err) {
    console.error('❌ Queue job failed:', err);
  } finally {
    running--;
    await wait(DELAY_BETWEEN_TASKS);
    processQueue();
  }
}

function enqueue(job) {
  queue.push(job);
  processQueue();
}

function getQueueSize() {
  return queue.length;
}

module.exports = {
  enqueue,
  getQueueSize
};
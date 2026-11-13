#!/usr/bin/env node
const REQUESTS = 10;
const MB = 1024 * 1024;

async function fetchOnce(url, timeoutMs) {
  const started = process.hrtime.bigint();
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
  }
  const elapsed = Number(process.hrtime.bigint() - started) / 1e9;
  return { size, elapsed };
}

function parseArgs(argv) {
  const args = { url: null, requests: REQUESTS, timeout: 30 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-n' || arg === '--requests') {
      args.requests = Number(argv[++i]);
    } else if (arg === '-t' || arg === '--timeout') {
      args.timeout = Number(argv[++i]);
    } else if (!args.url) {
      args.url = arg;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url || !Number.isInteger(args.requests) || args.requests < 1 || !(args.timeout > 0)) {
    console.error('Использование: node bench.js <url> [-n число_запросов] [-t таймаут_сек]');
    return 1;
  }

  let totalSize = 0;
  let totalTime = 0;

  for (let i = 1; i <= args.requests; i++) {
    try {
      const { size, elapsed } = await fetchOnce(args.url, args.timeout * 1000);
      totalSize += size;
      totalTime += elapsed;
      console.log(`Запрос ${i}/${args.requests}: ${(size / MB).toFixed(2)} МБ за ${elapsed.toFixed(3)} с`);
    } catch (error) {
      const reason = error.cause ? `${error.message}: ${error.cause.message ?? error.cause}` : error.message;
      console.error(`Запрос ${i} не удался: ${reason}`);
      return 1;
    }
  }

  const average = totalTime / args.requests;
  const speed = totalTime > 0 ? totalSize / MB / totalTime : 0;

  console.log(`Среднее время запроса: ${average.toFixed(3)} с`);
  console.log(`Всего скачано: ${(totalSize / MB).toFixed(2)} МБ (${totalSize} байт)`);
  console.log(`Скорость скачивания: ${speed.toFixed(2)} МБ/с (${(speed * 8).toFixed(2)} Мбит/с)`);
  return 0;
}

main().then((code) => process.exit(code));

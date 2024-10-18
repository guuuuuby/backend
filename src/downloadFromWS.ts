interface Result {
  readonly stream: ReadableStream<ArrayBuffer>;
  readonly contentLength: number;
}

export async function downloadFromWS(url: string | URL) {
  const socket = new WebSocket(url);
  const id = crypto.randomUUID();
  let start = performance.now();
  const log = (msg: unknown) =>
    console.log(`[${id}] [${(performance.now() - start).toFixed(2)}ms]`, msg);
  socket.onopen = () => log(`Opened downloading ws on ${url}`);
  socket.onerror = (event) => log(event);
  socket.onclose = () => log('Close');
  socket.binaryType = 'arraybuffer';

  let receivedBytes = 0;

  return new Promise<Result>((resolve, reject) => {
    const stream = new ReadableStream<ArrayBuffer>({
      start(controller) {
        socket.addEventListener(
          'message',
          (event) => {
            const contentLength =
              typeof event.data === 'string' ? +event.data : +new TextDecoder().decode(event.data);
            log(`Content length: ${contentLength.toLocaleString()} B`);

            socket.addEventListener('message', (event) => {
              const data: ArrayBuffer = event.data;
              controller.enqueue(data);
              receivedBytes += data.byteLength;

              log(`${((receivedBytes / contentLength) * 100).toFixed(2)}%`);

              if (receivedBytes >= contentLength) {
                controller.close();
                socket.close();
              }
            });

            resolve({ stream, contentLength });
          },
          { once: true }
        );

        socket.addEventListener('close', () => {
          try {
            controller.close();
          } catch {}
        });
      },
      cancel() {
        socket.close();
        reject();
      },
    });
  });
}

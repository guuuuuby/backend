interface Result {
  readonly stream: ReadableStream<ArrayBuffer>;
  readonly contentLength: number;
}

export async function downloadFromWS(url: string | URL) {
  const socket = new WebSocket(url);
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

            socket.addEventListener('message', (event) => {
              const data: ArrayBuffer = event.data;
              controller.enqueue(data);
              receivedBytes += data.byteLength;

              if (receivedBytes >= contentLength) {
                socket.close();
              }
            });

            resolve({ stream, contentLength });
          },
          { once: true }
        );

        socket.addEventListener('close', () => controller.close());
      },
      cancel() {
        socket.close();
        reject();
      },
    });
  });
}

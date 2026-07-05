// import Client, { Socket } from "socket.io-client";
// import { DefaultEventsMap } from "socket.io/dist/typed-events";

import { Timer } from "../src/entity/Timer";

// import { io } from "../src/app";
// import { Events } from "../src/data";
// import { GameData } from "../src/types";

// describe("my awesome project", () => {
//   let client: Socket<DefaultEventsMap, DefaultEventsMap>
//   beforeAll(() => {
//     io.listen(3000)
//     client = Client(`http://localhost:3000`);
//   });

//   afterAll(() => {
//     client.close()
//     io.close()
//   })

//   test("should work", async () => {
//     await handleConnect()

//     await client.emitWithAck(Events.Handshake)

//     await client.emitWithAck(Events.SetReward, 32)

//     const fullState = await client.emitWithAck(Events.GetFullState) as GameData

//     console.log(fullState.state)

//     await timeout(2000)

//   });

//   function handleConnect() {
//     return new Promise<void>(resolve => {
//       client.on("connect", () => {
//         resolve()
//       });
//     })
//   }

//   function timeout(ms: number) {
//     return new Promise<void>(resolve =>
//       setTimeout(() => {
//         resolve()
//       }, ms)
//     )
//   }
// });

// it('test timer #1', async () => {


//   const timer = new Timer(2000, () => { console.log('lola_keka') })

//   timer.startOrResume()

//   console.log('start', timer.timerTime)

//   await timeout(500)

//   console.log('after timeout 500', timer.timerTime)

//   timer.pause()
//   await timeout(2000)
//   console.log('after timeout 2000', timer.timerTime)
//   await timeout(500)
//   console.log('after timeout 500', timer.timerTime)
//   timer.startOrResume()
//   console.log('after last start', timer.timerTime)
//   await timeout(500)
//   console.log('after timeout 500', timer.timerTime)
//   await timeout(500)
//   console.log('after timeout 500', timer.timerTime)
//   await timeout(500)
//   console.log('after timeout 500', timer.timerTime)
//   console.log('start', timer.timerTime)
//   timer.startOrResume()
//   await timeout(500)
//   console.log('after timeout 500', timer.timerTime)
//   await timeout(500)
//   console.log('after timeout 500', timer.timerTime)
//   await timeout(500)
//   console.log('after timeout 500', timer.timerTime)

// }, 60000)

it.skip('kek', () => { })

function timeout(ms: number) {
  return new Promise<void>(resolve =>
    setTimeout(() => {
      resolve()
    }, ms)
  )
}
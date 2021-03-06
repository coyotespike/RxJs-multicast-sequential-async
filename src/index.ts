import { ConnectableObservable, firstValueFrom, forkJoin, isObservable, lastValueFrom, Observable } from 'rxjs';
import { concatMap, publish, takeLast, tap } from 'rxjs/operators';


/*******

        This is a demonstration of handling async production of values, multicast observers,
        and async yet strictly sequential processing of values.

        It models (for instance) a stream of values produced at inconsistent times, with multiple
        processes that do some work with those values, then upload the value to a remote data store.

        At the same time, the uploading must proceed sequentially. In our case we are writing to a CSV file.
        The rows have to stay in the same order. Therefore, the same process cannot start working on the
        next-emitted value until the previous value has uploaded already.

        In other words, we need the iterator to send values ASAP, and each worker process to upload to S3 ASAP,
        but we also need each worker process to keep the values in order even if one S3 upload takes a long time.

        RxJs lets us do all of that.

        An Observable takes the values from the iterator, and sends it as a stream to multicasted observers.
        Each observer waits to process the next value until it's finished the previous value.

        If you run this file multiple times, you will note that occasionally one worker/observer completes
        all its values before the the others have really started on their values. But each worker/observer
        processes each value in the correct sequence.

       ********/

// Helper constants and functions
const cyan = '\x1b[36m%s\x1b[0m'
const purple = "\x1b[35m"
const yello = "\x1b[33m"
const red = "\x1b[31m"
const colorLog = (color: string) => (message: string) => console.log(color, message)
const cyanLog = colorLog(cyan)
const purpleLog = colorLog(purple)
const yellowLog = colorLog(yello)
const redLog = colorLog(red)

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleepRandomInterval() {
    await timeout(getRandomInt(200, 9000));
    return
}

function getRandomDelay() {
    return Math.random() * 5000 // up to 5 seconds
}

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// This will emit values at random intervals
// Models an async producer
const ob = new Observable(sub => {
    let timeout: any = null;
    let count = 1;

    // recursively send a number to the subscriber
    // after a random delay
    (function push() {
        timeout = setTimeout(
            () => {
                if (count === 5) {
                    sub.complete()
                }
                sub.next(count);
                count++;
                push();
            },
            // Without the random delay, the Observable will complete synchronously
            getRandomDelay()
        );
    })();

    // clear any pending timeout on teardown
    // This is called almost immediately, apparently piping to multicast
    //// lets us automatically unsubscribe
    return () => {
        redLog(`Original observable completed and unsubscribed`)
        clearTimeout(timeout)
    };
});


// subjects are observers and observables
// We can multicast to them as observers
// But they have their own pipelines as observables
// publish operator calls multicast(new Subject()) for us
const multicasted = ob.pipe(
    publish()
) as ConnectableObservable<number>;

// You cannot add any explicit subscribes here.

const observerA = multicasted
    .pipe(
        // concatMap ensures previous value finishes processing before next value
        concatMap(async(val: any ) => {
            // Models async side effect, e.g. uploading to S3
            await sleepRandomInterval()
            cyanLog(`ObserverA pipeline: ${val}`);
            return val
        }),
        takeLast(1),
        tap((lastValue: number) => {
            cyanLog(`ObserverA received all values, lastValue: ${lastValue}`);
            cyanLog('ObserverA waited');
        })
    )

const observerB = multicasted
    .pipe(
        // concatMap ensures previous value finishes processing before next value
        concatMap(async(val: any ) => {
            // Models async side effect, e.g. uploading to S3
            await sleepRandomInterval()
            purpleLog(`ObserverB pipeline: ${val}`);
            return val
        }),
        takeLast(1),
        tap((lastValue: number) => {
            purpleLog(`ObserverB received all values, lastValue: ${lastValue}`);
        })
    )

const observerC = multicasted
    .pipe(
        // concatMap ensures previous value finishes processing before next value
        concatMap(async(val: any ) => {
            // Models async side effect, e.g. uploading to S3
            await sleepRandomInterval()
            yellowLog(`ObserverC pipeline: ${val}`);
            return val
        }),
        takeLast(1),
        tap(async(lastValue: number) => {
            yellowLog(`ObserverC received all values, lastValue: ${lastValue}`);
            // Demonstrate an async task after all values completed, like awaiting S3
            await sleepRandomInterval()
            yellowLog('ObserverC waited');
        }),
    )

// connect returns a subscription which we can use
const subscribed = multicasted.connect();

// Be sure not to add any subscriptions above
// forkJoin creates a subscription here
// multiple subscriptions will trigger a new run
// and all observers process the same value twice

const joined = forkJoin([observerA, observerB, observerC])
joined
    .subscribe({
        // Models completing a task after all workers have finished
        // For example sending an email notification
        // we can just wrap all finishing logic in the forkJoin subscribe
        complete: () => {
            console.info('ForkJoin finished processing');
            console.log('done! unsubscribing')
            subscribed.unsubscribe()
        },
        next: (args: any) => {
            console.log('forkJoin sees: ', args);
        }
    });

/*
  If we need to unsubscribe, we cannot use refCount and must do it manually
  or we may not need to, because the whole process should exit, and GC will clean up
  Unsubscribing from forkJoin early cancels execution, but multicasted continues
  lastValueFrom(joined) results in a promise rejection
  I lean towards leaving forkJoined alone
  */

async function execute() {
    const lastValue = await lastValueFrom(multicasted)

    redLog(`Source has emitted all values, last value: ${lastValue}`)
    subscribed.unsubscribe()
    redLog(`We are now unsubscribed from multicast source`)
}
execute()

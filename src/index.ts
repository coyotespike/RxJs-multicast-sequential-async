import { Observable, Subject } from 'rxjs';
import { concatMap, multicast } from 'rxjs/operators';


// Helper constants and functions

const cyan = '\x1b[36m%s\x1b[0m'
const purple = "\x1b[35m"
const yello = "\x1b[33m"
const colorLog = (color: string) => (message: string) => console.log(color, message)
const cyanLog = colorLog(cyan)
const purpleLog = colorLog(purple)
const yellowLog = colorLog(yello)

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleepRandomInterval() {
    await timeout(getRandomInt(200, 9000));
    return
}

function getRandomDelay() {
    return Math.random() * 1000
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

    // recursively send a random number to the subscriber
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
            getRandomDelay()
        );
    })();

    // clear any pending timeout on teardown
    return () => clearTimeout(timeout);
});


const subject = new Subject();
const multicasted = ob.pipe(
    multicast(subject)
) as any;



// subjects are observers and observables
// We can multicast to them as observers
// But they have their own pipelines as observables
const subject1 = new Subject();
const subject2 = new Subject();
const subject3 = new Subject();


subject1
    .pipe(
        concatMap(async(val: any ) => {
            // Models async side effect, e.g. uploading to S3
            await sleepRandomInterval()
            cyanLog(`ObserverA pipeline: ${val}`);
            return val
        })
    )
    .subscribe({
        complete: () => {
            cyanLog('ObserverA received all values');
        },
        next: (val: any) => {
            cyanLog(`ObserverA finished: ${val}`);
        }
    });

subject2
    .pipe(
        concatMap(async(val: any ) => {
            await sleepRandomInterval()
            // Models async side effect, e.g. uploading to S3
            purpleLog(`ObserverB pipeline: ${val}`);
            return val
        })
    )
    .subscribe({
        complete: () => {
            purpleLog('ObserverB received all values');
        },
        next: (val: any) => {
            purpleLog(`ObserverB finished: ${val}`);
        }
    });

subject3
    .pipe(
        concatMap(async(val: any ) => {
            // Models async side effect, e.g. uploading to S3
            await sleepRandomInterval()
            yellowLog(`ObserverC pipeline: ${val}`);
            return val
        })
    )
    .subscribe({
        complete: () => {
            yellowLog('ObserverC received all values');
        },
        next: (val: any) => {
            yellowLog(`ObserverC finished: ${val}`);
        }
    });

multicasted.subscribe(subject1);
multicasted.subscribe(subject2);
multicasted.subscribe(subject3);
multicasted.connect();

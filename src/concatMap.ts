import { identity, from, Subject, BehaviorSubject, forkJoin, zip } from 'rxjs';
import { iterator } from 'rxjs/dist/types/internal/symbol/iterator';
import { concatMap, multicast, tap, delay } from 'rxjs/operators';

const cyan = '\x1b[36m%s\x1b[0m'
const purple = "\x1b[35m"
const yello = "\x1b[33m"
const colorLog = (color: string) => (message: string) => console.log(color, message)
const cyanLog = colorLog(cyan)
const purpleLog = colorLog(purple)
const yellowLog = colorLog(yello)


function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const createIteratorSubject = ( iterator: any ) => {
  const iterator$ = new BehaviorSubject(0) as any;

    const pushNextValue = ({ done, value }: { done: Boolean, value: any}) => {
    if (done && value === undefined) {
      iterator$.complete();
    } else {
      iterator$.next(value);
    }
  };

  iterator$.push = ( value: any ) => pushNextValue(iterator.next(value));

  iterator$.push();

  return iterator$;
};

const createGenerator = function*() {
  yield 1;
  yield 2;
  yield 3;
  yield 4;
};

const generator = createGenerator();

const iterator$ = createIteratorSubject(generator);

const subject = new Subject();

const multicasted = iterator$.pipe(
  // tap(value => console.info('Observable received incoming value', value)),
  delay(1000),
  // tap(value => console.info('Observable done processing value', value)),
  multicast(subject)
);

const subject1 = new Subject();
const subject2 = new Subject();
const subject3 = new Subject();

subject1
    .pipe(concatMap((val: any ) => from([ val ])))
    .subscribe({
    complete: () => {
        cyanLog('ObserverA received all values');
    },
    next: (val: any) => {
        setTimeout(() => {
            cyanLog(`ObserverA finished: ${val}`);
        }, getRandomInt(500, 3000));
    }
});

subject2
    .pipe(concatMap((val: any ) => from([ val ])))
    .subscribe({
    complete: () => {
        purpleLog('ObserverB received all values');
    },
    next: (val: any) => {
        setTimeout(() => {
            purpleLog(`ObserverB finished: ${val}`);
        }, getRandomInt(500, 3000));
    }
});

subject3
    .pipe(concatMap((val: any ) => from([ val ])))
    .subscribe({
    complete: () => {
        yellowLog('ObserverC received all values');
    },
    next: (val: any) => {
        setTimeout(() => {
            yellowLog(`ObserverC finished: ${val}`);
        }, getRandomInt(500, 3000));
    }
});

const joinedObserver =
    zip([subject1, subject2, subject3])
        .pipe(
            concatMap((val: any ) => from([ val ]))
        )
        .subscribe({
            complete: () => {
                console.info('ForkJoin finished processing');
            },
            next: (args: any) => {
                console.log('forkJoin sees: ', args);
                iterator$.push();
            }
        });

multicasted.subscribe(subject1);
multicasted.subscribe(subject2);
multicasted.subscribe(subject3);
multicasted.connect();

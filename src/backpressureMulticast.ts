import { from, Subject, BehaviorSubject, forkJoin, zip } from 'rxjs';
import { iterator } from 'rxjs/dist/types/internal/symbol/iterator';
import { multicast, tap, delay } from 'rxjs/operators';

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
  tap(value => console.info('Observable received incoming value', value)),
  delay(1000),
  tap(value => console.info('Observable done processing value', value)),
  multicast(subject)
);

const subject1 = new Subject();
const subject2 = new Subject();
const subject3 = new Subject();

subject3.subscribe({
    complete: () => {
        console.info('ObserverC received all values');
    },
    next: (val: any) => {
        setTimeout(() => {
            console.log(`ObserverC finished: ${val}`);
        }, getRandomInt(500, 3000));
    }
});

subject1.subscribe({
    complete: () => {
        console.info('ObserverA received all values');
    },
    next: (val: any) => {
        setTimeout(() => {
            console.log(`ObserverA finished: ${val}`);
        }, getRandomInt(500, 3000));
    }
});

subject2.subscribe({
    complete: () => {
        console.info('ObserverB received all values');
    },
    next: (val: any) => {
        setTimeout(() => {
            console.log(`ObserverB finished: ${val}`);
        }, getRandomInt(500, 3000));
    }
});

/*
  This higher-order observable waits for the 'next' of each of the observables/observers.
  Only then will it pull the next value from our source/producer.
  Thus, each observer processes in parallel, but synchronized.
  The synchronization pins each process's progress to the slowest process.
  This makes an out-of-order async process less likely, but not impossible.

  An out-of-sequence result is easier to see if you use just one observer.
  Concretely, ObserverA might finish processing value 4 before value 3.
  */

const joinedObserver = zip([subject1, subject2, subject3]);
joinedObserver.subscribe({
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


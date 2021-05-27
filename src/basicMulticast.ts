import { from, Subject, } from 'rxjs';
import { multicast, tap, delay } from 'rxjs/operators';

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const source = from([1, 2, 3]);
const subject = new Subject();
const multicasted = source.pipe(multicast(subject)) as any;

// These are, under the hood, `subject.subscribe({...})`:
multicasted.subscribe({
    next: (v: any) => {
        setTimeout(() => {
            console.log(`observerA: ${v}`)
        }, getRandomInt(500, 3000))
    }
});
multicasted.subscribe({
    next: (v: any) => console.log(`observerB: ${v}`)
});

// This is, under the hood, `source.subscribe(subject)`:
multicasted.connect();

const subject2 = new Subject<number>();

subject2.subscribe({
    next: (v) => console.log(`observerC: ${v}`)
});
subject2.subscribe({
    next: (v) => console.log(`observerD: ${v}`)
});

const observable = from([4, 5, 6]);

observable.subscribe(subject2);


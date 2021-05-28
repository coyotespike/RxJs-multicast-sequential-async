

## RxJs
[Lossless Backpressure in RxJS](https://itnext.io/lossless-backpressure-in-rxjs-b6de30a1b6d4)

## Memory Profiling

One way is to inspect the heap growth over time and inspect which objects remain
(are not garbage collected) and grow in size. From this you deduce which code
has created the objects.

Another way is to display a memory allocation timeline chart. Chrome DevTools
can then display which function has caused the memory increase! Chrome DevTools can do this for 
[the browser](https://developer.chrome.com/docs/devtools/memory-problems/#allocation-profile)
or for [Node](https://github.com/thlorenz/v8-perf/blob/master/memory-profiling.md#devtools-allocation-profile).
This is really astounding because DevTools lets us profile memory usage, AND use the
function execution stack to trace to the offending code. 

The memory allocation timeline approach seems much faster than simply relying on
snapshots and the types of objects to track down the offending code.


- [Useful background on V8 memory](https://deepu.tech/memory-management-in-v8/)
- [Performance analysis - Node.js](https://medium.com/@rishabh171192/performance-analysis-node-js-68cc4628205c)
- [V8 perf
  guide](https://github.com/thlorenz/v8-perf/blob/master/memory-profiling.md),
  especially the section on `Recording Allocation Timeline` 
- [v8-profiler tool](https://www.npmjs.com/package/v8-profiler) can help with
  CPU profiling and memory heap snapshots.
- [Native Node heap profiler](https://nodejs.org/api/inspector.html#inspector_heap_profiler)
- [Good article on CPU profiling in production](https://medium.com/voodoo-engineering/node-js-and-cpu-profiling-on-production-in-real-time-without-downtime-d6e62af173e2)

## How to use
    
    1. Turn the iterator into a stream (easy)
    2. The producer pipes through a tap to hit primeRoleCache, which must be
       made to work with a single value.
    3. Put each observer's csvStream in a global (object) and pass it in
    4. Then, each pipeline uses the generator function (refactored to work with
       a single value), and writes to the csvStream
    5. Map over each and make a subscription, or pass to each and return a subscription.
    6. Each observer's complete() does the try { await putResult } and forkedEM.persist
    7. Consider awaiting a forkJoin lastValueFrom for the whole thing
    

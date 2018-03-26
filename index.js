import choose   from './modules/choose';
import curry    from './modules/curry';
import overload from './modules/overload';
import _rest    from './modules/rest';

console.log('>>', choose, curry, overload, _rest);

export const rest = curry(_rest);
export { choose, curry, overload }

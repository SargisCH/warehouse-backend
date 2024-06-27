// export all seeds from here
import payoutTypeSeed from './payoutType.seed';

Promise.all([payoutTypeSeed].map((f) => f())).then(() => {
  console.log('seed run successfully');
});

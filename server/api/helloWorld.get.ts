export default defineEventHandler(event => {
  return {
    type: getMethod(event),
    message: getQuery(event)
  };
})

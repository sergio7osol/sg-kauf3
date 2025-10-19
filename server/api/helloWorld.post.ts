export default defineEventHandler(async event => {
  const body = await readBody(event);

  return {
    type: getMethod(event),
    body
  };
})

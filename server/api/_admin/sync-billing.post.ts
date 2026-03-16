export default defineEventHandler(async () => {
  const result = await syncAllContracts()
  return result
})

export default defineEventHandler(async (event) => {
  const supabase = useSupabaseServer()
  
  try {
    // Простой тестовый запрос - просто проверяем, есть ли таблица
    const { data, error } = await supabase
      .from('news')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Supabase error:', error)
      return {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }
    }
    
    return {
      success: true,
      message: 'Подключение к Supabase работает',
      data
    }
  } catch (e: any) {
    console.error('Exception:', e)
    return {
      success: false,
      error: e.message,
      stack: e.stack
    }
  }
})

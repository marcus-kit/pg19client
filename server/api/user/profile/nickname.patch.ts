// PATCH /api/user/profile/nickname — отключено (поле nickname убрано из схемы)

import type { UpdateNicknameResponse } from '~/types/community'

export default defineEventHandler(async (): Promise<UpdateNicknameResponse> => {
  throw createError({
    statusCode: 410,
    message: 'Изменение никнейма отключено'
  })
})

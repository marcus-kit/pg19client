/**
 * API-роут авторизации по договору (POST /api/auth/contract).
 *
 * Принимает: contractNumber, lastName, firstName.
 * Проверяет в Supabase: находит контракт по номеру, проверяет пользователя
 * по ФИО, проверяет что аккаунт не заблокирован.
 *
 * При успехе: создаёт сессию (auth_sessions), устанавливает httpOnly cookie,
 * возвращает данные user и account.
 * Также определяет тариф через таблицу subscriptions/services.
 */
import { NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createUserSession } from '@/lib/auth'

interface ContractBody {
  contractNumber: string
  lastName: string
  firstName: string
}

export async function POST(request: NextRequest) {
  let body: ContractBody
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { message: 'Неверный формат тела запроса' },
      { status: 400 }
    )
  }

  if (!body.contractNumber || !body.lastName || !body.firstName) {
    return Response.json({ message: 'Заполните все поля' }, { status: 400 })
  }

  const supabase = getSupabaseServer()

  const { data: account, error: accountError } = await supabase
    .from('contracts')
    .select(
      `
      id,
      user_id,
      contract_number,
      balance,
      status,
      address_full,
      start_date
    `
    )
    .eq('contract_number', parseInt(body.contractNumber, 10))
    .single()

  if (accountError || !account) {
    return Response.json({ message: 'Договор не найден' }, { status: 404 })
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select(
      `
      id,
      first_name,
      last_name,
      middle_name,
      full_name,
      email,
      phone,
      telegram_id,
      telegram_username,
      birth_date,
      avatar,
      vk_id,
      status
    `
    )
    .eq('id', account.user_id)
    .single()

  if (userError || !user) {
    return Response.json({ message: 'Пользователь не найден' }, { status: 404 })
  }

  const lastNameMatch =
    user.last_name?.toLowerCase() === body.lastName.toLowerCase()
  const firstNameMatch =
    user.first_name?.toLowerCase() === body.firstName.toLowerCase()

  if (!lastNameMatch || !firstNameMatch) {
    return Response.json(
      { message: 'Неверные данные. Проверьте фамилию и имя.' },
      { status: 401 }
    )
  }

  if (user.status === 'suspended' || user.status === 'terminated') {
    return Response.json(
      { message: 'Ваш аккаунт заблокирован' },
      { status: 403 }
    )
  }

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(
      `
      id,
      status,
      services (
        id,
        name,
        type
      )
    `
    )
    .eq('account_id', account.id)
    .eq('status', 'active')

  type SubRow = { id: unknown; status: unknown; services: { id: unknown; name: string; type: string } | null }
  const internetSub = (subscriptions as SubRow[] | null)?.find(
    (s) => s.services?.type === 'internet'
  )
  const tariffName = internetSub?.services?.name ?? 'Не подключен'

  await createUserSession(
    user.id,
    account.id,
    'contract',
    body.contractNumber,
    {
      last_name: body.lastName,
      first_name: body.firstName,
    }
  )

  return Response.json({
    success: true,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      middleName: user.middle_name,
      phone: user.phone || '',
      email: user.email || '',
      telegram: user.telegram_username ? `@${user.telegram_username}` : '',
      telegramId: user.telegram_id || null,
      vkId: user.vk_id || '',
      avatar: user.avatar || null,
      birthDate: user.birth_date || null,
      role: 'user',
    },
    account: {
      contractNumber: account.contract_number,
      balance: account.balance,
      status: account.status,
      tariff: tariffName,
      address: account.address_full || '',
      startDate: account.start_date,
    },
  })
}

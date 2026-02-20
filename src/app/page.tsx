/**
 * Корневая страница приложения ("/").
 *
 * Сама по себе ничего не отображает — делегирует отрисовку компоненту
 * {@link Redirect}, который проверяет состояние авторизации и перенаправляет
 * пользователя либо на /dashboard (если авторизован), либо на /login.
 *
 * @module page
 * @exports Home — React-компонент корневой страницы
 */
import { Redirect } from './redirect'

export default function Home() {
  return <Redirect />
}

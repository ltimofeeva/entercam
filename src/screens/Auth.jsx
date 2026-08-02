import { useEffect, useState } from 'react'

function formatPhone(value) {
  let digits = value.replace(/\D/g, '')

  if (!digits) return ''

  if (digits[0] === '8') {
    digits = '7' + digits.slice(1)
  }

  if (digits[0] !== '7') {
    digits = '7' + digits
  }

  digits = digits.slice(0, 11)

  const country = '+7'
  const p1 = digits.slice(1, 4)
  const p2 = digits.slice(4, 7)
  const p3 = digits.slice(7, 9)
  const p4 = digits.slice(9, 11)

  let result = country

  if (p1) result += ` (${p1}`
  if (p1.length === 3) result += ')'
  if (p2) result += ` ${p2}`
  if (p3) result += `-${p3}`
  if (p4) result += `-${p4}`

  return result
}

function normalizeLoginResponse(data, phone) {
  if (!data) {
    return null
  }

  if (data.success === false || data.authorized === false) {
    return null
  }

  const employees =
    (Array.isArray(data.employees) && data.employees) ||
    (Array.isArray(data['Сотрудники']) && data['Сотрудники']) ||
    []

  if (data.user) {
    return {
      login: data.user.phone || phone,
      phone: data.user.phone || phone,
      name: data.user.name || data.user.fio || phone,
      fio: data.user.fio || data.user.name || phone,
      department: data.user.department || '',
      department_id: data.user.department_id || '',
      role: data.user.role || '',
      employees,
    }
  }

  if (data.employee) {
    return {
      login: data.employee.phone || phone,
      phone: data.employee.phone || phone,
      name: data.employee.name || data.employee.fio || phone,
      fio: data.employee.fio || data.employee.name || phone,
      department: data.employee.department || '',
      department_id: data.employee.department_id || '',
      role: data.employee.role || '',
      employees,
    }
  }

  return {
    login: data.phone || data.Tel_num || phone,
    phone: data.phone || data.Tel_num || phone,
    name: data.name || data.fio || data.FIO || phone,
    fio: data.fio || data.FIO || data.name || phone,
    department: data.department || data.Otdel || '',
    department_id: data.department_id || data.Otdel_id || '',
    role: data.role || '',
    employees,
  }
}

// Превращает ответ вебхука об отказе в текст ошибки для пользователя.
// Поддерживает разные варианты полей, которые может вернуть n8n:
// { error: "user_not_found" } / { code: "wrong_password" } / { reason: ... } / { message: "..." }
function loginErrorMessage(data) {
  const code = String(data?.error || data?.code || data?.reason || '')
    .toLowerCase()

  if (code.includes('not_found') || code.includes('no_user')) {
    return 'Пользователь с таким номером не найден. Пройдите регистрацию.'
  }

  if (code.includes('password')) {
    return 'Неверный пароль.'
  }

  if (data?.message) {
    return data.message
  }

  return 'Неверный номер телефона или пароль.'
}

// Ответ вебхука change_password: отдельно ловим случай, когда номера нет в базе.
function resetErrorMessage(data) {
  const code = String(data?.error || data?.code || data?.reason || '')
    .toLowerCase()

  if (code.includes('not_found') || code.includes('no_user')) {
    return 'Пользователь не зарегистрирован, перейдите на форму регистрации или проверьте номер телефона'
  }

  if (data?.message) {
    return data.message
  }

  return 'Пользователь не зарегистрирован, перейдите на форму регистрации или проверьте номер телефона'
}

function normalizeDepartmentsResponse(data) {
  if (!data) {
    return []
  }

  const list = Array.isArray(data) ? data : []

  return list
    .map((item) => item.name)
    .filter(Boolean)
}

export default function Auth({ onLogin }) {
  const [tab, setTab] = useState('login')

  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [registerLoading, setRegisterLoading] = useState(false)

  const [resetPhone, setResetPhone] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const [departments, setDepartments] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [departmentsError, setDepartmentsError] = useState('')

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setDepartmentsLoading(true)
        setDepartmentsError('')

        const response = await fetch(
          'https://n8n.lpaderina.ru/webhook/entercam-departments',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          }
        )

        if (!response.ok) {
          throw new Error(`Ошибка сервера: ${response.status}`)
        }

        const data = await response.json()
        console.log('Departments response:', data)

        const normalizedDepartments = normalizeDepartmentsResponse(data)

        setDepartments(normalizedDepartments)
      } catch (error) {
        console.error('Departments loading error:', error)
        setDepartmentsError('Не удалось загрузить отделы')
      } finally {
        setDepartmentsLoading(false)
      }
    }

    loadDepartments()
  }, [])

  const openLoginTab = () => {
    setTab('login')
  }

  const openRegisterTab = () => {
    setTab('register')
  }

  const openResetTab = () => {
    setResetError('')
    setResetSuccess('')
    setTab('reset')
  }

  const handleResetPhoneFocus = () => {
    if (!resetPhone) {
      setResetPhone('+7')
    }
  }

  const handleResetPhoneChange = (e) => {
    setResetPhone(formatPhone(e.target.value))
    if (resetError) setResetError('')
  }

  const handleResetPhoneBlur = () => {
    if (resetPhone === '+7') {
      setResetPhone('')
    }
  }

  const handleLoginPhoneFocus = () => {
    if (!loginPhone) {
      setLoginPhone('+7')
    }
  }

  const handleLoginPhoneChange = (e) => {
    const formatted = formatPhone(e.target.value)
    setLoginPhone(formatted)
    if (loginError) setLoginError('')
  }

  const handleLoginPhoneBlur = () => {
    if (loginPhone === '+7') {
      setLoginPhone('')
    }
  }

  const handlePhoneFocus = () => {
    if (!phone) {
      setPhone('+7')
    }
  }

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
  }

  const handlePhoneBlur = () => {
    if (phone === '+7') {
      setPhone('')
    }
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()

    setLoginError('')

    if (!loginPhone || loginPhone.length < 18) {
      setLoginError('Введите номер телефона полностью')
      return
    }

    if (!loginPassword) {
      setLoginError('Введите пароль')
      return
    }

    try {
      setLoginLoading(true)

      const response = await fetch('https://n8n.lpaderina.ru/webhook/log_in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: loginPhone,
          password: loginPassword,
        }),
      })

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`)
      }

      const data = await response.json()
      console.log('Login response:', data)

      if (data.success === false || data.authorized === false) {
        setLoginError(loginErrorMessage(data))
        return
      }

      const userData = normalizeLoginResponse(data, loginPhone)

      if (!userData) {
        setLoginError('Неверный номер телефона или пароль.')
        return
      }

      onLogin(userData)
    } catch (error) {
      console.error('Login error:', error)
      setLoginError('Не удалось выполнить вход. Проверьте подключение к интернету.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()

    if (!fullName.trim()) {
      alert('Введите ФИО')
      return
    }

    if (!phone || phone.length < 18) {
      alert('Введите номер телефона полностью')
      return
    }

    if (!department) {
      alert('Выберите отдел')
      return
    }

    if (!password || password.length < 6) {
      alert('Пароль должен содержать не менее 6 символов')
      return
    }

    if (password !== passwordConfirm) {
      alert('Пароли не совпадают')
      return
    }

    try {
      setRegisterLoading(true)

      const response = await fetch('https://n8n.lpaderina.ru/webhook/add_employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fio: fullName.trim(),
          phone,
          department,
          password,
        }),
      })

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`)
      }

      const data = await response.json()
      console.log('Register response:', data)

      if (data.success === false) {
        alert(data.message || 'Не удалось добавить сотрудника')
        return
      }

      alert('Сотрудник добавлен')

      setFullName('')
      setPhone('')
      setDepartment('')
      setPassword('')
      setPasswordConfirm('')
      setTab('login')
    } catch (error) {
      console.error('Register error:', error)
      alert('Не удалось добавить сотрудника. Проверьте подключение или настройки n8n.')
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()

    setResetError('')
    setResetSuccess('')

    if (!resetPhone || resetPhone.length < 18) {
      setResetError('Введите номер телефона полностью')
      return
    }

    if (!resetPassword || resetPassword.length < 6) {
      setResetError('Пароль должен содержать не менее 6 символов')
      return
    }

    if (resetPassword !== resetPasswordConfirm) {
      setResetError('Пароли не совпадают')
      return
    }

    try {
      setResetLoading(true)

      const response = await fetch('https://n8n.lpaderina.ru/webhook/change_password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: resetPhone,
          password: resetPassword,
        }),
      })

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`)
      }

      const data = await response.json()
      console.log('Change password response:', data)

      if (data.success === false || data.updated === false) {
        setResetError(resetErrorMessage(data))
        return
      }

      setResetPhone('')
      setResetPassword('')
      setResetPasswordConfirm('')
      setResetSuccess('Пароль изменён. Теперь войдите с новым паролем.')
    } catch (error) {
      console.error('Change password error:', error)
      setResetError('Не удалось изменить пароль. Проверьте подключение к интернету.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            {tab === 'reset' ? 'Задайте новый пароль' : 'Добро пожаловать'}
          </h1>
          <p className="auth-subtitle">
            {tab === 'reset'
              ? 'Укажите номер телефона, на который зарегистрирован сотрудник'
              : 'Войдите в приложение или добавьте нового сотрудника'}
          </p>
        </div>

        {tab === 'reset' ? null : (
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={openLoginTab}
          >
            Авторизация
          </button>

          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={openRegisterTab}
          >
            Регистрация
          </button>
        </div>
        )}

        {tab === 'login' ? (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <div className="auth-field">
              <label>Номер телефона</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="+7 (___) ___-__-__"
                value={loginPhone}
                onFocus={handleLoginPhoneFocus}
                onChange={handleLoginPhoneChange}
                onBlur={handleLoginPhoneBlur}
                autoComplete="tel"
              />
            </div>

            <div className="auth-field">
              <label>Пароль</label>
              <input
                type="password"
                placeholder="Введите пароль"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value)
                  if (loginError) setLoginError('')
                }}
                autoComplete="current-password"
              />
            </div>

            {loginError ? (
              <p className="auth-error">{loginError}</p>
            ) : null}

            <button
              type="submit"
              className="auth-primary-btn"
              disabled={loginLoading}
            >
              {loginLoading ? 'Входим...' : 'Войти'}
            </button>

            <button
              type="button"
              className="auth-link-btn"
              onClick={openResetTab}
            >
              Забыли пароль?
            </button>
          </form>
        ) : tab === 'register' ? (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="auth-field">
              <label>ФИО</label>
              <input
                type="text"
                placeholder="Введите ФИО"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="auth-field">
              <label>Номер телефона</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="+7 (___) ___-__-__"
                value={phone}
                onFocus={handlePhoneFocus}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                autoComplete="tel"
              />
            </div>

            <div className="auth-field">
              <label>Отдел</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={departmentsLoading}
              >
                <option value="">
                  {departmentsLoading ? 'Загрузка отделов...' : 'Выберите отдел'}
                </option>

                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              {departmentsError ? (
                <p className="auth-error">{departmentsError}</p>
              ) : null}
            </div>

            <div className="auth-field">
              <label>Пароль</label>
              <input
                type="password"
                placeholder="Не менее 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="auth-field">
              <label>Повторите пароль</label>
              <input
                type="password"
                placeholder="Повторите пароль"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="auth-primary-btn"
              disabled={registerLoading}
            >
              {registerLoading ? 'Идет регистрация...' : 'Зарегистрироваться'}
            </button>

            <button
              type="button"
              className="auth-link-btn"
              onClick={openResetTab}
            >
              Забыли пароль?
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleResetSubmit}>
            <div className="auth-field">
              <label>Номер телефона</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="+7 (___) ___-__-__"
                value={resetPhone}
                onFocus={handleResetPhoneFocus}
                onChange={handleResetPhoneChange}
                onBlur={handleResetPhoneBlur}
                autoComplete="tel"
              />
            </div>

            <div className="auth-field">
              <label>Новый пароль</label>
              <input
                type="password"
                placeholder="Не менее 6 символов"
                value={resetPassword}
                onChange={(e) => {
                  setResetPassword(e.target.value)
                  if (resetError) setResetError('')
                }}
                autoComplete="new-password"
              />
            </div>

            <div className="auth-field">
              <label>Повторите пароль</label>
              <input
                type="password"
                placeholder="Повторите новый пароль"
                value={resetPasswordConfirm}
                onChange={(e) => {
                  setResetPasswordConfirm(e.target.value)
                  if (resetError) setResetError('')
                }}
                autoComplete="new-password"
              />
            </div>

            {resetError ? <p className="auth-error">{resetError}</p> : null}
            {resetSuccess ? <p className="auth-success">{resetSuccess}</p> : null}

            <button
              type="submit"
              className="auth-primary-btn"
              disabled={resetLoading}
            >
              {resetLoading ? 'Сохраняем...' : 'Сохранить новый пароль'}
            </button>

            <button
              type="button"
              className="auth-link-btn"
              onClick={openLoginTab}
            >
              Вернуться ко входу
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

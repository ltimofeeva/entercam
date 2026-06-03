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

  if (data.success === false) {
    return null
  }

  if (data.user) {
    return {
      login: data.user.phone || phone,
      phone: data.user.phone || phone,
      name: data.user.name || data.user.fio || phone,
      fio: data.user.fio || data.user.name || phone,
      department: data.user.department || '',
      role: data.user.role || '',
    }
  }

  if (data.employee) {
    return {
      login: data.employee.phone || phone,
      phone: data.employee.phone || phone,
      name: data.employee.name || data.employee.fio || phone,
      fio: data.employee.fio || data.employee.name || phone,
      department: data.employee.department || '',
      role: data.employee.role || '',
    }
  }

  return {
    login: data.phone || phone,
    phone: data.phone || phone,
    name: data.name || data.fio || phone,
    fio: data.fio || data.name || phone,
    department: data.department || '',
    role: data.role || '',
  }
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
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('')
  const [registerLoading, setRegisterLoading] = useState(false)

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

  const handleLoginPhoneFocus = () => {
    if (!loginPhone) {
      setLoginPhone('+7')
    }
  }

  const handleLoginPhoneChange = (e) => {
    const formatted = formatPhone(e.target.value)
    setLoginPhone(formatted)
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

    if (!loginPhone || loginPhone.length < 18) {
      alert('Введите номер телефона полностью')
      return
    }

    if (!password.trim()) {
      alert('Введите пароль')
      return
    }

    try {
      setLoginLoading(true)

      const response = await fetch('https://n8n.lpaderina.ru/webhook/employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: loginPhone,
          password: password.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`)
      }

      const data = await response.json()
      console.log('Login response:', data)

      if (data.success === false) {
        alert(data.message || 'Неверный номер телефона или пароль')
        return
      }

      const userData = normalizeLoginResponse(data, loginPhone)

      if (!userData) {
        alert('Неверный номер телефона или пароль')
        return
      }

      onLogin(userData)
    } catch (error) {
      console.error('Login error:', error)
      alert('Не удалось выполнить вход. Проверьте подключение или настройки n8n.')
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
        }),
      })

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`)
      }

      const data = await response.json()
      console.log('Register response:', data)

      if (data.success === false) {
        alert(data.message || 'Не удалось отправить заявку')
        return
      }

      alert('Заявка на регистрацию отправлена')

      setFullName('')
      setPhone('')
      setDepartment('')
      setTab('login')
    } catch (error) {
      console.error('Register error:', error)
      alert('Не удалось отправить заявку. Проверьте подключение или настройки n8n.')
    } finally {
      setRegisterLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Добро пожаловать</h1>
          <p className="auth-subtitle">
            Войдите в приложение или оставьте заявку на регистрацию
          </p>
        </div>

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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

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
              onClick={() => alert('Восстановление пароля подключим следующим шагом')}
            >
              Забыли пароль?
            </button>
          </form>
        ) : (
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

            <button
              type="submit"
              className="auth-primary-btn"
              disabled={registerLoading}
            >
              {registerLoading ? 'Отправляем...' : 'Отправить заявку'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

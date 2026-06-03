import { useState } from 'react'

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

function normalizeDepartments(data) {
  if (!data) return []

  if (Array.isArray(data)) {
    return data.map((item) => ({
      id: item.id || item.uuid || item.name || item.title || String(item),
      name: item.name || item.title || item.department || String(item),
    }))
  }

  if (Array.isArray(data.departments)) {
    return data.departments.map((item) => ({
      id: item.id || item.uuid || item.name || item.title || String(item),
      name: item.name || item.title || item.department || String(item),
    }))
  }

  if (Array.isArray(data.data)) {
    return data.data.map((item) => ({
      id: item.id || item.uuid || item.name || item.title || String(item),
      name: item.name || item.title || item.department || String(item),
    }))
  }

  return []
}

export default function Auth({ onLogin }) {
  const [tab, setTab] = useState('login')

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('')

  const [departments, setDepartments] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [departmentsError, setDepartmentsError] = useState('')

  const loadDepartments = async () => {
    try {
      if (departmentsLoading) return

      alert('Клик по регистрации: отправляю запрос в n8n')
      console.log('START loadDepartments')

      setDepartmentsLoading(true)
      setDepartmentsError('')

      await fetch('https://n8n.lpaderina.ru/webhook-test/entercam-departments', {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          source: 'entercam_app',
          test: true,
        }),
      })

      console.log('Запрос отправлен в n8n в режиме no-cors')
    } catch (error) {
      console.error('Departments error:', error)
      setDepartmentsError('Не удалось загрузить отделы')
    } finally {
      setDepartmentsLoading(false)
    }
  }

  const openLoginTab = () => {
    setTab('login')
  }

  const openRegisterTab = () => {
    setTab('register')
    loadDepartments()
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

  const handleLoginSubmit = (e) => {
    e.preventDefault()

    if (!login.trim() || !password.trim()) {
      alert('Введите логин и пароль')
      return
    }

    const userData = {
      login: login.trim(),
      name: login.trim(),
      fio: login.trim(),
      department: '',
    }

    onLogin(userData)
  }

  const handleRegisterSubmit = (e) => {
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

    console.log('register submit', {
      fullName,
      phone,
      department,
    })

    alert('Заявка на регистрацию отправлена')

    setTab('login')
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
              <label>Логин</label>
              <input
                type="text"
                placeholder="Введите логин"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
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

            <button type="submit" className="auth-primary-btn">
              Войти
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
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>

              {departmentsError ? (
                <div className="auth-error">{departmentsError}</div>
              ) : null}
            </div>

            <button type="submit" className="auth-primary-btn">
              Отправить заявку
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

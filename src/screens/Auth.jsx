import { useState } from 'react'

const departments = [
  'Администрация',
  'Отдел продаж',
  'Охрана',
  'Склад',
  'Бухгалтерия',
]

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

export default function Auth({ onLogin }) {
  const [tab, setTab] = useState('login')

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('')

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
            onClick={() => setTab('login')}
          >
            Авторизация
          </button>

          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => setTab('register')}
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
              >
                <option value="">Выберите отдел</option>
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
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

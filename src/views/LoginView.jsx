import React from "react"

export default function LoginView({
    tokenInput,
    setTokenInput,
    remember,
    setRemember,
    loginStatus,
    handleLogin,
    handlePaste,
    active
}) {
    return (
        <section className={`view ${active ? "view-active" : ""}`.trim()} aria-labelledby="loginTitle">
            <div className="auth-layout">
                <aside className="auth-aside">
                    <p className="kicker">Топ дс брс</p>
                    <h1 id="loginTitle">Сервис БРС ЮФУ</h1>
                    <p className="lead">Когда мне предложили купить проигрыватель, я отказался, ведь мне нужен только выигрыватель.</p>
                    <a className="link-inline" target="_blank" rel="noopener noreferrer" href="https://grade.sfedu.ru/sign?goal=/student/authtokenget">
                        Получить токен доступа
                    </a>
                </aside>

                <div className="auth-card" aria-live="polite">
                    <label className="field">
                        <span>Токен авторизации</span>
                        <input
                            className="input mono"
                            type="text"
                            placeholder="40 символов hex"
                            maxLength="40"
                            autoComplete="off"
                            value={tokenInput}
                            onChange={(event) => setTokenInput(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && handleLogin()}
                        />
                    </label>

                    <div className="auth-actions-row">
                        <label className="check">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(event) => setRemember(event.target.checked)}
                            />
                            <span>Запомнить на этом устройстве</span>
                        </label>
                        <button className="btn btn-ghost" type="button" onClick={handlePaste}>Вставить</button>
                    </div>

                    <div className="auth-buttons">
                        <button className="btn btn-primary" type="button" onClick={handleLogin}>Войти в БРС</button>
                    </div>

                    <p className={`status ${loginStatus.message ? "status-visible" : ""} ${loginStatus.type ? `status-${loginStatus.type}` : ""}`.trim()} role="status">
                        {loginStatus.message}
                    </p>
                </div>
            </div>
            <p className="footer-credit">romka навайбкодил</p>
        </section>
    )
}

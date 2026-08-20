import React, { useEffect } from "react"

export default function ConfirmDialog({ open, title, description, onCancel, onConfirm }) {
    useEffect(() => {
        if (!open) return undefined
        const handleKeyDown = (event) => {
            if (event.key === "Escape") onCancel()
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [open, onCancel])

    if (!open) return null

    return (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
            <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="logoutDialogTitle">
                <p className="kicker">Подтверждение</p>
                <h2 id="logoutDialogTitle">{title}</h2>
                <p>{description}</p>
                <div className="dialog-actions">
                    <button className="btn btn-ghost" type="button" onClick={onCancel}>Отмена</button>
                    <button className="btn btn-danger" type="button" onClick={onConfirm}>Выйти</button>
                </div>
            </div>
        </div>
    )
}

import React from "react"

export default function StateEmpty({ title, description }) {
    return (
        <div className="state state-empty">
            <h4>{title}</h4>
            <p>{description}</p>
        </div>
    )
}

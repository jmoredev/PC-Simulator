import { CREDITS } from '../data/credits'

/** Créditos y licencias de los recursos externos. */
export function CreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay">
      <div className="card">
        <h1>Créditos y licencias</h1>
        <p className="lead">
          Los modelos 3D y las imágenes de los conectores son obra de sus autores y
          se usan con la licencia que se indica en cada uno. Los modelos 3D están
          <b> modificados</b> para poder servirse por web (ver «Cambios»).
        </p>

        <ul className="credits">
          {CREDITS.map((credit) => (
            <li key={credit.file}>
              <div className="credits__what">{credit.what}</div>
              <div className="credits__meta">
                <code>{credit.file}</code>
                {credit.author ? ` · ${credit.author}` : ' · autor por documentar'}
                {credit.license && (
                  <>
                    {' · '}
                    {credit.licenseUrl ? (
                      <a href={credit.licenseUrl} target="_blank" rel="noreferrer">
                        {credit.license}
                      </a>
                    ) : (
                      credit.license
                    )}
                  </>
                )}
                {credit.source && (
                  <>
                    {' · '}
                    <a href={credit.source} target="_blank" rel="noreferrer">
                      ficha original
                    </a>
                  </>
                )}
              </div>
              {credit.changes && (
                <div className="credits__changes">Cambios: {credit.changes}</div>
              )}
            </li>
          ))}
        </ul>

        <div className="overlay-actions">
          <button className="btn btn--accent" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

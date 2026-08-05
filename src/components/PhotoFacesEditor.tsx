import { useRef, useState, type ChangeEvent, type RefObject } from 'react'
import { FACE_COUNT } from '../domain/dice'
import {
  EMPTY_PHOTO_FACES,
  fillEmptyPhotoFaces,
  photoFaceCount,
  setPhotoFace,
  type PhotoFaces,
} from '../domain/photoFaces'
import { toSquarePhoto } from '../photos/photoFile'
import './PhotoFacesEditor.css'

interface PhotoFacesEditorProps {
  faces: PhotoFaces
  onFacesChange: (faces: PhotoFaces) => void
  onClose: () => void
}

export function PhotoFacesEditor({ faces, onFacesChange, onClose }: PhotoFacesEditorProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  // Face visée par la sélection en cours ; `null` = remplissage des faces vides.
  const targetValueRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const openPicker = (inputRef: RefObject<HTMLInputElement | null>, value: number | null) => {
    targetValueRef.current = value
    inputRef.current?.click()
  }

  const handleSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, FACE_COUNT)
    // Remis à zéro tout de suite : sans cela, resélectionner le même fichier
    // n'émettrait aucun évènement.
    event.target.value = ''
    if (files.length === 0) return

    const target = targetValueRef.current
    try {
      const photos = await Promise.all(files.map(toSquarePhoto))
      onFacesChange(
        target === null
          ? fillEmptyPhotoFaces(faces, photos)
          : setPhotoFace(faces, target, photos[0]),
      )
      setError(null)
    } catch {
      setError("Cette image n'a pas pu être chargée.")
    }
  }

  const filledCount = photoFaceCount(faces)

  return (
    <div className="photo-faces-editor" role="dialog" aria-modal="true" aria-label="Photos des faces">
      <div className="photo-faces-editor-card">
        <header className="photo-faces-editor-header">
          <h2>Photos des faces</h2>
          <button type="button" className="photo-faces-editor-close" onClick={onClose}>
            Fermer
          </button>
        </header>

        <p className="photo-faces-editor-hint">
          {filledCount}/{FACE_COUNT} faces personnalisées. Les faces sans photo gardent leurs points.
        </p>

        <ul className="photo-faces-editor-grid">
          {faces.map((photo, index) => {
            const value = index + 1
            return (
              <li key={value} className="photo-faces-editor-slot">
                <button
                  type="button"
                  className="photo-faces-editor-tile"
                  aria-label={`Choisir la photo de la face ${value}`}
                  onClick={() => openPicker(galleryInputRef, value)}
                >
                  {photo === null ? (
                    <span className="photo-faces-editor-placeholder">{value}</span>
                  ) : (
                    <img src={photo} alt="" />
                  )}
                </button>
                <div className="photo-faces-editor-actions">
                  <button
                    type="button"
                    aria-label={`Photographier la face ${value}`}
                    onClick={() => openPicker(cameraInputRef, value)}
                  >
                    <span aria-hidden="true">📷</span>
                  </button>
                  {photo !== null && (
                    <button
                      type="button"
                      aria-label={`Retirer la photo de la face ${value}`}
                      onClick={() => onFacesChange(setPhotoFace(faces, value, null))}
                    >
                      <span aria-hidden="true">✕</span>
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {error !== null && <p className="photo-faces-editor-error">{error}</p>}

        <footer className="photo-faces-editor-footer">
          <button type="button" onClick={() => openPicker(galleryInputRef, null)}>
            Remplir les faces vides
          </button>
          <button
            type="button"
            disabled={filledCount === 0}
            onClick={() => onFacesChange(EMPTY_PHOTO_FACES)}
          >
            Tout effacer
          </button>
        </footer>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={event => void handleSelection(event)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={event => void handleSelection(event)}
        />
      </div>
    </div>
  )
}

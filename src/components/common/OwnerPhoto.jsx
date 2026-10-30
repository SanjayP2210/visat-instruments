// Frames an original owner photograph as a portrait without distorting it.
// The crop is done with object-fit/position only, anchored at the top so the face stays in view.
export default function OwnerPhoto({ photo, className = 'aspect-[4/5]', eager = false }) {
  return (
    <div className={`relative overflow-hidden bg-navy-50 ${className}`}>
      <img
        src={photo.src}
        alt={photo.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="h-full w-full object-cover object-top"
      />
    </div>
  )
}

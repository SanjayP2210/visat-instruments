import { Camera } from 'lucide-react'

// Displays an original product photograph without distortion.
// `fit: 'contain'` keeps the whole photo visible (tall or screen photos);
// `fit: 'cover'` fills the frame for photos with a clear central subject.
// Products without an original photograph get a neutral placeholder (never a stock image).
export default function ProductImage({ image, className = '', aspect = 'aspect-[4/3]', eager = false, label }) {
  if (!image?.src) {
    return (
      <div
        role="img"
        aria-label={label ? `Photo of ${label} coming soon` : 'Product photo coming soon'}
        className={`relative grid place-items-center overflow-hidden bg-navy-50 ${aspect} ${className}`}
      >
        <div className="absolute inset-3 rounded-lg border border-dashed border-steel-300" aria-hidden="true" />
        <div className="relative flex flex-col items-center gap-2 px-4 text-center text-steel-500">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-navy-700 ring-1 ring-steel-200">
            <Camera className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-navy-800">Photo coming soon</span>
        </div>
      </div>
    )
  }

  const contain = image.fit === 'contain'
  return (
    <div className={`relative overflow-hidden bg-navy-50 ${aspect} ${className}`}>
      <img
        src={image.src}
        alt={image.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={`h-full w-full transition-transform duration-500 group-hover:scale-[1.03] ${
          contain ? 'object-contain p-3' : 'object-cover'
        }`}
      />
    </div>
  )
}

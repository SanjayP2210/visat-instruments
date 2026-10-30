// Displays an original product photograph without distortion.
// `fit: 'contain'` keeps the whole photo visible (tall or screen photos);
// `fit: 'cover'` fills the frame for photos with a clear central subject.
export default function ProductImage({ image, className = '', aspect = 'aspect-[4/3]', eager = false }) {
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

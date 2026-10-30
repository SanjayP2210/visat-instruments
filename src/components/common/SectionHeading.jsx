export default function SectionHeading({ eyebrow, title, intro, align = 'left', light = false, className = '' }) {
  const centered = align === 'center'
  return (
    <div className={`${centered ? 'mx-auto text-center' : ''} max-w-2xl ${className}`}>
      {eyebrow && <p className={`eyebrow ${centered ? 'justify-center' : ''}`}>{eyebrow}</p>}
      <h2 className={`mt-3 text-3xl font-bold sm:text-4xl ${light ? 'text-white' : 'text-navy-900'}`}>{title}</h2>
      {intro && (
        <p className={`mt-4 text-base leading-relaxed ${light ? 'text-navy-100/80' : 'text-steel-600'}`}>{intro}</p>
      )}
    </div>
  )
}

import { useReveal } from '../../hooks/useReveal'

export default function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...props }) {
  const ref = useReveal()
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...props}
    >
      {children}
    </Tag>
  )
}

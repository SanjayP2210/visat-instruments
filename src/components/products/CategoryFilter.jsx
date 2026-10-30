export default function CategoryFilter({ categories, active, counts, onChange }) {
  const options = [{ slug: '', name: 'All Products' }, ...categories]

  return (
    <div role="group" aria-label="Filter products by category" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-2 pb-1 sm:w-auto sm:flex-wrap">
        {options.map((option) => {
          const isActive = active === option.slug
          return (
            <button
              key={option.slug || 'all'}
              type="button"
              onClick={() => onChange(option.slug)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-navy-900 bg-navy-900 text-white'
                  : 'border-steel-200 bg-white text-steel-600 hover:border-navy-900/40 hover:text-navy-900'
              }`}
            >
              {option.name}
              <span
                className={`rounded-full px-1.5 text-[11px] ${isActive ? 'bg-accent-500 text-white' : 'bg-navy-50 text-steel-500'}`}
              >
                {counts[option.slug] ?? 0}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

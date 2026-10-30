import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import About from './pages/About'
import Contact from './pages/Contact'
import Gallery from './pages/Gallery'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import ProductDetail from './pages/ProductDetail'
import Products from './pages/Products'
import Services from './pages/Services'
import WeighbridgeSolutions from './pages/WeighbridgeSolutions'

// Private owner area: separate bundle, outside the public layout and navigation.
const OwnerApp = lazy(() => import('./owner/OwnerApp'))

export default function App() {
  return (
    <Routes>
      <Route
        path="owner-information/*"
        element={
          <Suspense fallback={null}>
            <OwnerApp />
          </Suspense>
        }
      />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:slug" element={<ProductDetail />} />
        <Route path="weighbridge-solutions" element={<WeighbridgeSolutions />} />
        <Route path="services" element={<Services />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

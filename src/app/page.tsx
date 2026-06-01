import HeroBanner from "@/components/home/HeroBanner"
import CategoryGrid from "@/components/home/CategoryGrid"
import FeaturedProducts from "@/components/home/FeaturedProducts"
import BrandStrip from "@/components/home/BrandStrip"
import NewArrivals from "@/components/home/NewArrivals"
import NewsletterSection from "@/components/home/NewsletterSection"

export default function Home() {
  return (
    <>
      <HeroBanner />
      <CategoryGrid />
      <FeaturedProducts />
      <BrandStrip />
      <NewArrivals />
      <NewsletterSection />
    </>
  )
}

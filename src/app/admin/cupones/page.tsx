import { getAllCoupons } from "@/server/services/coupon.service"
import { getCategories } from "@/server/services/category.service"
import CuponesClient from "./CuponesClient"

export default async function CuponesPage() {
  const [coupons, categories] = await Promise.all([
    getAllCoupons(),
    getCategories(),
  ])

  return (
    <div className="p-6 md:p-8">
      <CuponesClient coupons={coupons} categories={categories} />
    </div>
  )
}

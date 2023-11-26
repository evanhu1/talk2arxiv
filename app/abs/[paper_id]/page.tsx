import { redirect } from 'next/navigation'
 
export default async function Redirect({ params }: { params: { paper_id: string } }) {
    redirect(`../pdf/${params.paper_id}.pdf`)
}

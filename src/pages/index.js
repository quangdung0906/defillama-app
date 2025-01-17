import Layout from '~/layout'
import { RAISES_API } from '~/constants'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'
import { getChainsPageData } from '~/api/categories/adaptors'
import { getPeggedOverviewPageData } from '~/api/categories/stablecoins'

import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'
import { ChainContainer } from '~/containers/ChainContainer'

import { groupBy, mapValues, sumBy } from 'lodash'
import { buildPeggedChartData } from '~/utils/stablecoins'

const fetch = fetchWithErrorLogging

const sum = (obj) => {
	return Object.values(obj).reduce((acc, curr) => (typeof curr === 'number' ? (acc += curr) : acc), 0)
}

export const getStaticProps = withPerformanceLogging('index', async () => {
	const data = await getChainPageData()
	const volumeData = await getChainsPageData('dexs')
	const raisesData = await fetch(RAISES_API).then((r) => r.json())
	const stablecoinsData = await getPeggedOverviewPageData(null)
	const chainVolumeData = null
	const chainFeesData = null
	const bridgeData = null
	const feesData = null
	const selectedChain = 'All'

	const chainProtocolsVolumes = []
	if (chainVolumeData) {
		chainVolumeData?.protocols?.forEach((prototcol) =>
			chainProtocolsVolumes.push(prototcol, ...(prototcol?.subRows || []))
		)
	}

	const chainProtocolsFees = []

	if (chainFeesData) {
		chainFeesData?.protocols?.forEach((prototcol) => chainProtocolsFees.push(prototcol, ...(prototcol?.subRows || [])))
	}

	const bridgeChartData = bridgeData
		? bridgeData?.chainVolumeData?.map((volume) => [volume?.date, volume?.Deposits, volume.Withdrawals])
		: null

	const volumeChart =
		selectedChain === 'All' || volumeData?.totalDataChart[0]?.[0][selectedChain]
			? volumeData?.totalDataChart?.[0].map((val) => [
					val.date,
					selectedChain === 'All' ? sum(val) : val[selectedChain]
			  ])
			: null

	const feesChart = feesData?.totalDataChart?.[0].length
		? feesData?.totalDataChart?.[0]?.map((val) => [val.date, val.Fees, val.Revenue])
		: null

	const raisesChart =
		raisesData && raisesData?.raises
			? mapValues(
					groupBy(raisesData.raises, (val) => val.date),
					(raises) => sumBy(raises, 'amount')
			  )
			: null

	const { peggedAreaTotalData } = buildPeggedChartData(
		stablecoinsData?.chartDataByPeggedAsset,
		stablecoinsData?.peggedAssetNames,
		Object.values(stablecoinsData?.peggedNameToChartDataIndex || {}),
		'mcap',
		stablecoinsData?.chainTVLData,
		'All'
	)

	return {
		props: {
			...data.props,
			raisesData,
			stablecoinsChartData: peggedAreaTotalData,
			chainProtocolsVolumes,
			chainProtocolsFees,
			bridgeChartData,
			volumeChart,
			feesChart,
			raisesChart,
			totalFundingAmount: raisesChart ? Object.values(raisesChart).reduce((acc, curr) => (acc += curr), 0) * 1e6 : null
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function HomePage(props) {
	return (
		<Layout title="DefiLlama - DeFi Dashboard">
			<ChainContainer {...props} />
		</Layout>
	)
}

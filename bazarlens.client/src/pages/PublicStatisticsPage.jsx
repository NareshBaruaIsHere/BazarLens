import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import LocationFields from '../components/LocationFields';
import { emptyLocation } from '../utils/locations';
import { mockApi } from '../services/mockApi';
import { useData } from '../components/useData';
import { AppLogo, Card, DataState, Field, Footer, Heading, Table } from '../components/UI';

export default function PublicStatisticsPage() {
  const [productId,setProduct] = useState('');
  const [location,setLocation] = useState({...emptyLocation});
  const loader = useCallback(() => mockApi.getPublicStatistics({productId,...location}),[productId,location]);
  const state = useData(loader);
  return <div className="public-page">
    <header className="public-header"><Link to="/"><AppLogo/></Link><Link to="/login">Sign in to contribute</Link></header>
    <main className="public-statistics">
      <Heading title="Public price statistics" description="Compare approved market prices across Bangladesh. No account required."/>
      <p className="demo-warning">Frontend demo · Illustrative prices stored in this browser. These are not live market quotes.</p>
      <DataState state={state}>{data => <>
        <Card><div className="filters">
          <Field label="Product" value={productId} onChange={e => setProduct(e.target.value)} options={[{value:'',label:'All products'},...data.products.map(p => ({value:p.id,label:`${p.name} (${p.unit})`}))]}/>
          <LocationFields markets={data.markets} value={location} onChange={setLocation}/>
          <button onClick={() => {setProduct('');setLocation({...emptyLocation});}}>Clear filters</button>
        </div><div className="dashboard public-table"><Table rows={data.prices} columns={['Product','Bazar / thana','Average (৳)','Unit','Updated']} render={p => <>
          <td>{p.product}</td><td>{p.market}<small className="cell-small">{p.area}</small></td><td>{p.average.toFixed(2)}</td><td>{p.unit}</td><td>{p.date}</td>
        </>}/></div><p className="muted">Each market uses its latest approved observation date. Compare the same product and unit.</p></Card>
      </>}</DataState>
    </main><Footer/>
  </div>;
}

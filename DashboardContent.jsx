import React,{useState} from 'react';
import {EvidenceChart,DataComponent,DataTable,Filters,MetricCard,Section,SectionNavigator,Dropdown,Dialog,RichNarrative,useDataApp,useSectionFilters} from '../../data-app-public.jsx';
import './benchmark.css';
const definitions=[['nodes','参与台数','node_label'],['model','模型','model'],['engine','引擎','engine_group'],['precision','精度','precision_group'],['metric','指标口径','metric'],['source','来源','source']].map(([id,label,field])=>({id,label,field,defaultValue:'all',queryIds:['tests']}));
const columns=[['id','编号'],['nodes','台数'],['model','模型'],['configuration','精度／引擎'],['conditions','并发／负载'],['metric','指标口径'],['values','报告结果'],['source','原始来源']].map(([field,label])=>({field,label,...(field==='source'?{renderCell:(v,r)=><a href={r.url} target="_blank" rel="noreferrer">{v}</a>}: {})}));
const comparisonColumns=[{field:'layout',label:'节点／拓扑'},{field:'valueLabel',label:'原始结果'},{field:'relative',label:'相对首行速度'},{field:'source',label:'来源',renderCell:(v,r)=><a href={r.url} target="_blank" rel="noreferrer">{v}</a>}];
const detailFields=[['nodes','实际参与台数'],['model','模型标签'],['hardware','硬件身份'],['precision','精度／量化'],['engine','引擎／配置'],['concurrency','并发数'],['workload','输入／输出与上下文'],['metric','指标口径'],['values','报告结果'],['note','限定与解释'],['date','测试／核查日期'],['evidence','材料完整度']];
function Experiments(){
 const {reviewedRows}=useDataApp();const all=reviewedRows('comparisons',['case','layout']);const [choice,setChoice]=useState('nv-qwen');
 const rows=all.filter(r=>r.case===choice),first=rows[0],lower=choice==='llama-tpot';
 const labels=Object.fromEntries(all.map(r=>[r.case,r.label]));
 const display=rows.map(r=>({...r,valueLabel:r.value.toLocaleString('zh-CN',{maximumFractionDigits:2})+' '+r.unit,relative:(lower?first.value/r.value:r.value/first.value).toFixed(2)+'×'}));
 return <Section id="compare-section" title="同条件扩展对照" filters={<Dropdown label="对照实验" showLabel value={choice} choices={Object.keys(labels)} choiceLabels={labels} onChange={setChoice}/>}>
  <RichNarrative id="comparison-method" value={first?.note??'尚无可显示的实验。'} className="bench-note"/>
  <div className="bench-pair">
   <EvidenceChart key={choice} id={'experiment-'+choice} queryId="comparisons" title={labels[choice]+(lower?' · 越低越好':' · 越高越好')} sourceRows={rows} rows={rows} height={320} stackable={false} spec={{type:'bar',x:'layout',y:'value',showValues:true,valueDecimals:2,startAtZero:true,yLabel:first?.unit}}/>
   <DataComponent id={'comparison-values-'+choice} queryId="comparisons" kind="table" title="原始结果与组内速度比" sourceRows={rows} displayRows={display} description="只在当前实验内部计算：吞吐为本行/首行，时延为首行/本行。不同实验、单位和文本类型不混算。"><DataTable rows={display} columns={comparisonColumns} searchable={false} caption="当前对照实验结果"/></DataComponent>
  </div>
 </Section>;
}
function TestExplorer(){
 const scope=useSectionFilters(definitions,{}, {id:'test-explorer'});const scoped=scope.componentProps('tests',['id','date']);const rows=scoped.displayRows;
 const [selected,setSelected]=useState(null);const unique=k=>new Set(rows.map(r=>r[k])).size;
 const counts=[1,2,3,4,8].map(n=>({nodes:n,label:n+'台',count:rows.filter(r=>r.nodes===n).length}));
 return <Section id="records-section" title="筛选测试记录" filters={<Filters {...scope.filterProps}/>}>
  <div className="bench-metrics">{[['matched','当前测试单元',rows.length],['sources','数值来源项',unique('source_key')],['models','模型标签',unique('model')]].map(([id,title,value])=><MetricCard key={id} id={'scope-'+id} queryId="tests" {...scoped} title={title} value={value} displayRows={rows} description="当前筛选范围。测试单元不是独立实验室或基础模型总数；同一模型的不同负载分开保留。"/>)}</div>
  <EvidenceChart id="sample-by-nodes" queryId="tests" {...scoped} title="当前样本按参与台数分布" rows={counts} displayRows={counts} sourceRows={rows} height={220} spec={{type:'bar',x:'label',y:'count',showValues:true,valueDecimals:0,startAtZero:true,yLabel:'摘录单元数'}} description="当前筛选的摘录记录数，不反映市场占比、模型支持总量或对应性能。"/>
  <DataComponent id="test-records" queryId="tests" {...scoped} title="测试明细 · 点击记录查看完整条件" kind="table" displayRows={rows} sourceRows={rows} description="124条LLM、11条图像生成、5条训练。搜索仅作用于表格；上方条件作用于整组统计和表格。范围、约数及缺失不填零。"><DataTable rows={rows} columns={columns} caption="DGX Spark测试记录" rowKey="id" selectedRowKey={selected?.id} onRowSelect={setSelected} rowActionLabel={r=>'查看 '+r.id+' '+r.model+' 的完整测试条件'}/></DataComponent>
  <Dialog open={!!selected} onClose={()=>setSelected(null)} title={selected?selected.id+' · '+selected.model:'测试详情'} expanded>{selected&&<DataComponent id="selected-test-evidence" queryId="tests" kind="custom" variant="plain" title="完整测试条件" sourceRows={[selected]} displayRows={[selected]}><dl className="bench-detail" data-reviewed-rows>{detailFields.map(([f,label])=><div key={f}><dt>{label}</dt><dd>{selected[f]??'未披露'}</dd></div>)}<div><dt>原始报告</dt><dd><a href={selected.url} target="_blank" rel="noreferrer">{selected.source} ↗</a></dd></div></dl></DataComponent>}</Dialog>
 </Section>;
}
function Catalogue(){
 const {reviewedRows}=useDataApp();const rows=reviewedRows('catalogue');
 const cols=[{field:'title',label:'资料',renderCell:(v,r)=><a href={r.url} target="_blank" rel="noreferrer">{v} ↗</a>},{field:'date',label:'测试／核查日期'},{field:'kind',label:'发布者性质'},{field:'level',label:'完整度'},{field:'scope',label:'价值与边界'}];
 return <Section id="sources-section" title="原始资料与统计边界">
  <RichNarrative id="bench-boundaries" value={'公开检索截至 **2026年11月4日**：20项数值来源、140条关键测试单元，另列5项索引／方法／搭建分享。54个模型标签包含版本、历史lane和class级命名，不等于54个去重基础模型。A表示条件与对照较完整，B有缺项或混合配置，C缺少关键口径；这些标签不是可信度评分。未独立复跑硬件，也不保证穷尽全网。\n\n16台帖子仅提供搭建与网络分享，未取得16机同模型速度；两台设备分别服务单机模型仍计作单机。单路生成、并发总量、TTFT、图像秒数和训练吞吐分别保留，不跨单位排名。'} className="bench-note"/>
  <DataComponent id="source-catalogue" queryId="catalogue" title="25项原始资料目录" kind="table" sourceRows={rows} displayRows={rows}><DataTable rows={rows} columns={cols} caption="原始资料目录"/></DataComponent>
 </Section>;
}
export function DashboardContent(){return <div className="spark-bench-dashboard"><SectionNavigator sections={[{id:'compare-section',label:'同条件对照'},{id:'records-section',label:'测试库筛选'},{id:'sources-section',label:'原始资料'}]}/><Experiments/><TestExplorer/><Catalogue/></div>;}

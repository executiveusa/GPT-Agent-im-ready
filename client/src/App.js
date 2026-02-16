import './styles/home.css';
import { BrowserRouter, Route, Routes,Navigate } from 'react-router-dom';
import AgentConvo from './pages/AgentConvo';
import AgentConvoShare from './pages/AgentConvoShare';
import MeetingRoom from './pages/MeetingRoom';
import PaulisPlace from './pages/PaulisPlace';


function App() {
  return (
    <div className="App">
    <BrowserRouter>
     <Routes>
     <Route exact path='/' element={<AgentConvo/>}/>
     <Route exact path='/meeting' element={<MeetingRoom/>}/>
     <Route exact path='/paulis-place' element={<PaulisPlace/>}/>
     <Route exact path='/conversation/share' element={<AgentConvoShare/>}/>	 
     </Routes>
     </BrowserRouter>
    </div>
  );
}

export default App;
